;; Prediction Pools - Multi-Pool Prediction Market on Stacks
;; Anyone can create prediction pools with custom outcomes
;; Supports STX and USDCx payments
;; Built for Stacks Prediction Market

;; ============================================
;; CONSTANTS
;; ============================================

(define-constant CONTRACT-OWNER tx-sender)

;; Token types (u0 = STX, u1 = USDCx)
(define-constant TOKEN-STX u0)
(define-constant TOKEN-USDCX u1)

;; Error codes
(define-constant ERR-UNAUTHORIZED (err u401))
(define-constant ERR-INVALID-AMOUNT (err u400))
(define-constant ERR-POOL-NOT-FOUND (err u404))
(define-constant ERR-POOL-SETTLED (err u409))
(define-constant ERR-INVALID-OUTCOME (err u422))
(define-constant ERR-NOT-SETTLED (err u412))
(define-constant ERR-ALREADY-CLAIMED (err u410))
(define-constant ERR-NO-WINNINGS (err u411))
(define-constant ERR-POOL-EXPIRED (err u413))
(define-constant ERR-POOL-NOT-EXPIRED (err u414))
(define-constant ERR-INVALID-TITLE (err u420))
(define-constant ERR-INVALID-DESCRIPTION (err u421))
(define-constant ERR-INVALID-DURATION (err u423))
(define-constant ERR-ALREADY-BET (err u424))
(define-constant ERR-POOL-ACTIVE (err u425))
(define-constant ERR-DEPOSIT-NOT-CLAIMED (err u426))
(define-constant ERR-DEPOSIT-ALREADY-CLAIMED (err u427))
(define-constant ERR-INVALID-TOKEN-TYPE (err u428))
(define-constant ERR-TOKEN-TRANSFER-FAILED (err u429))

;; Configuration constants
(define-constant FEE-PERCENT u2) ;; 2% platform fee
(define-constant MIN-BET-AMOUNT-STX u1000000) ;; 1 STX minimum bet (6 decimals)
(define-constant MIN-BET-AMOUNT-USDCX u1000000) ;; 1 USDC minimum bet (6 decimals)
(define-constant POOL-DEPOSIT-STX u5000000) ;; 5 STX deposit to create pool
(define-constant POOL-DEPOSIT-USDCX u5000000) ;; 5 USDC deposit to create pool
(define-constant MIN-DURATION u144) ;; ~24 hours minimum (1 block per 10 min)
(define-constant MAX-DURATION u4320) ;; ~30 days maximum

;; ============================================
;; DATA STRUCTURES
;; ============================================

;; Pool data structure
(define-map pools
    { pool-id: uint }
    {
        creator: principal,
        title: (string-ascii 128),
        description: (string-ascii 256),
        outcome-a: (string-ascii 64),
        outcome-b: (string-ascii 64),
        category: (string-ascii 32),
        token-type: uint,  ;; u0 = STX, u1 = USDCx
        total-a: uint,
        total-b: uint,
        settled: bool,
        winning-outcome: (optional uint),
        created-at: uint,
        expiry: uint,
        deposit-claimed: bool
    }
)

;; User bets per pool
(define-map user-bets
    { pool-id: uint, user: principal }
    {
        amount-a: uint,
        amount-b: uint
    }
)

;; Claims tracking (winners who claimed)
(define-map claims
    { pool-id: uint, user: principal }
    bool
)

;; Refund tracking (for expired unsettled pools)
(define-map refunds
    { pool-id: uint, user: principal }
    bool
)

;; Global counters
(define-data-var pool-counter uint u0)
(define-data-var total-volume uint u0)
(define-data-var total-fees-collected uint u0)

;; ============================================
;; READ-ONLY FUNCTIONS
;; ============================================

(define-read-only (get-pool-count)
    (var-get pool-counter)
)

(define-read-only (get-pool (pool-id uint))
    (map-get? pools { pool-id: pool-id })
)

(define-read-only (get-user-bet (pool-id uint) (user principal))
    (map-get? user-bets { pool-id: pool-id, user: user })
)

(define-read-only (has-claimed (pool-id uint) (user principal))
    (default-to false (map-get? claims { pool-id: pool-id, user: user }))
)

(define-read-only (has-refunded (pool-id uint) (user principal))
    (default-to false (map-get? refunds { pool-id: pool-id, user: user }))
)

(define-read-only (get-pool-totals (pool-id uint))
    (match (map-get? pools { pool-id: pool-id })
        pool { total-a: (get total-a pool), total-b: (get total-b pool) }
        { total-a: u0, total-b: u0 }
    )
)

(define-read-only (get-total-volume)
    (var-get total-volume)
)

(define-read-only (get-min-bet-amount (token-type uint))
    (if (is-eq token-type TOKEN-STX)
        MIN-BET-AMOUNT-STX
        MIN-BET-AMOUNT-USDCX
    )
)

(define-read-only (get-pool-deposit (token-type uint))
    (if (is-eq token-type TOKEN-STX)
        POOL-DEPOSIT-STX
        POOL-DEPOSIT-USDCX
    )
)

;; ============================================
;; PRIVATE HELPER FUNCTIONS
;; ============================================

;; Transfer tokens from user to contract
(define-private (transfer-to-contract (token-type uint) (amount uint) (sender principal))
    (if (is-eq token-type TOKEN-STX)
        (stx-transfer? amount sender current-contract)
        (contract-call? 'SP120SBRBQJ00MCWS7TM5R8WJNTTKD5K0HFRC2CNE.usdcx transfer amount sender current-contract none)
    )
)

;; Transfer tokens from contract to user  
(define-private (transfer-from-contract (token-type uint) (amount uint) (recipient principal))
    (if (is-eq token-type TOKEN-STX)
        (as-contract? ((with-stx amount)) (unwrap-panic (stx-transfer? amount tx-sender recipient)))
        (as-contract? ((with-ft 'SP120SBRBQJ00MCWS7TM5R8WJNTTKD5K0HFRC2CNE.usdcx "usdcx" amount)) (unwrap-panic (contract-call? 'SP120SBRBQJ00MCWS7TM5R8WJNTTKD5K0HFRC2CNE.usdcx transfer amount tx-sender recipient none)))
    )
)

;; ============================================
;; PUBLIC FUNCTIONS
;; ============================================

;; Create a new prediction pool
;; token-type: u0 = STX, u1 = USDCx
;; Requires deposit that is refundable after settlement
(define-public (create-pool 
    (title (string-ascii 128)) 
    (description (string-ascii 256)) 
    (outcome-a (string-ascii 64)) 
    (outcome-b (string-ascii 64))
    (category (string-ascii 32))
    (duration uint)
    (token-type uint))
    (let 
        (
            (pool-id (var-get pool-counter))
            (creator tx-sender)
            (deposit-amount (get-pool-deposit token-type))
        )
        ;; Validate inputs
        (asserts! (> (len title) u0) ERR-INVALID-TITLE)
        (asserts! (> (len outcome-a) u0) ERR-INVALID-OUTCOME)
        (asserts! (> (len outcome-b) u0) ERR-INVALID-OUTCOME)
        (asserts! (>= duration MIN-DURATION) ERR-INVALID-DURATION)
        (asserts! (<= duration MAX-DURATION) ERR-INVALID-DURATION)
        (asserts! (or (is-eq token-type TOKEN-STX) (is-eq token-type TOKEN-USDCX)) ERR-INVALID-TOKEN-TYPE)

        ;; Transfer deposit from creator to contract
        (try! (transfer-to-contract token-type deposit-amount creator))

        ;; Create pool
        (map-set pools
            { pool-id: pool-id }
            {
                creator: creator,
                title: title,
                description: description,
                outcome-a: outcome-a,
                outcome-b: outcome-b,
                category: category,
                token-type: token-type,
                total-a: u0,
                total-b: u0,
                settled: false,
                winning-outcome: none,
                created-at: stacks-block-height,
                expiry: (+ stacks-block-height duration),
                deposit-claimed: false
            }
        )

        ;; Increment counter
        (var-set pool-counter (+ pool-id u1))

        ;; Emit event
        (print {
            event: "pool-created",
            pool-id: pool-id,
            creator: creator,
            title: title,
            outcome-a: outcome-a,
            outcome-b: outcome-b,
            category: category,
            token-type: token-type,
            expiry: (+ stacks-block-height duration)
        })

        (ok pool-id)
    )
)

;; Place a bet on a pool
;; outcome: 0 = outcome-a, 1 = outcome-b
;; Must use the same token type as the pool
(define-public (place-bet (pool-id uint) (outcome uint) (amount uint))
    (let 
        (
            (pool (unwrap! (map-get? pools { pool-id: pool-id }) ERR-POOL-NOT-FOUND))
            (user tx-sender)
            (token-type (get token-type pool))
            (min-bet (get-min-bet-amount token-type))
            (existing-bet (default-to { amount-a: u0, amount-b: u0 } 
                (map-get? user-bets { pool-id: pool-id, user: user })))
        )
        ;; Validations
        (asserts! (not (get settled pool)) ERR-POOL-SETTLED)
        (asserts! (< stacks-block-height (get expiry pool)) ERR-POOL-EXPIRED)
        (asserts! (or (is-eq outcome u0) (is-eq outcome u1)) ERR-INVALID-OUTCOME)
        (asserts! (>= amount min-bet) ERR-INVALID-AMOUNT)

        ;; Transfer tokens from user to contract
        (try! (transfer-to-contract token-type amount user))

        ;; Update user bet
        (if (is-eq outcome u0)
            (map-set user-bets
                { pool-id: pool-id, user: user }
                { 
                    amount-a: (+ (get amount-a existing-bet) amount), 
                    amount-b: (get amount-b existing-bet) 
                }
            )
            (map-set user-bets
                { pool-id: pool-id, user: user }
                { 
                    amount-a: (get amount-a existing-bet), 
                    amount-b: (+ (get amount-b existing-bet) amount) 
                }
            )
        )

        ;; Update pool totals
        (if (is-eq outcome u0)
            (map-set pools
                { pool-id: pool-id }
                (merge pool { total-a: (+ (get total-a pool) amount) })
            )
            (map-set pools
                { pool-id: pool-id }
                (merge pool { total-b: (+ (get total-b pool) amount) })
            )
        )

        ;; Update total volume
        (var-set total-volume (+ (var-get total-volume) amount))

        ;; Emit event
        (print {
            event: "bet-placed",
            pool-id: pool-id,
            user: user,
            outcome: outcome,
            amount: amount,
            token-type: token-type
        })

        (ok true)
    )
)

;; Settle a pool (only creator can settle)
;; winning-outcome: 0 = outcome-a wins, 1 = outcome-b wins
(define-public (settle-pool (pool-id uint) (winning-outcome uint))
    (let 
        (
            (pool (unwrap! (map-get? pools { pool-id: pool-id }) ERR-POOL-NOT-FOUND))
            (token-type (get token-type pool))
            (total-pool (+ (get total-a pool) (get total-b pool)))
            (fee (/ (* total-pool FEE-PERCENT) u100))
        )
        ;; Only creator can settle
        (asserts! (is-eq tx-sender (get creator pool)) ERR-UNAUTHORIZED)
        (asserts! (not (get settled pool)) ERR-POOL-SETTLED)
        (asserts! (or (is-eq winning-outcome u0) (is-eq winning-outcome u1)) ERR-INVALID-OUTCOME)

        ;; Transfer fee to contract owner
        (if (> fee u0)
            (try! (transfer-from-contract token-type fee CONTRACT-OWNER))
            true
        )

        ;; Update fees collected
        (var-set total-fees-collected (+ (var-get total-fees-collected) fee))

        ;; Mark pool as settled
        (map-set pools
            { pool-id: pool-id }
            (merge pool { 
                settled: true, 
                winning-outcome: (some winning-outcome) 
            })
        )

        ;; Emit event
        (print {
            event: "pool-settled",
            pool-id: pool-id,
            winning-outcome: winning-outcome,
            total-pool: total-pool,
            fee: fee,
            token-type: token-type
        })

        (ok true)
    )
)

;; Claim winnings from a settled pool
(define-public (claim-winnings (pool-id uint))
    (let 
        (
            (claimer tx-sender)
            (pool (unwrap! (map-get? pools { pool-id: pool-id }) ERR-POOL-NOT-FOUND))
            (token-type (get token-type pool))
            (user-bet (unwrap! (map-get? user-bets { pool-id: pool-id, user: claimer }) ERR-NO-WINNINGS))
            (winning-outcome (unwrap! (get winning-outcome pool) ERR-NOT-SETTLED))
            (total-pool (+ (get total-a pool) (get total-b pool)))
            (fee (/ (* total-pool FEE-PERCENT) u100))
            (net-pool (- total-pool fee))
            (winning-pool (if (is-eq winning-outcome u0) (get total-a pool) (get total-b pool)))
            (user-winning-bet (if (is-eq winning-outcome u0) (get amount-a user-bet) (get amount-b user-bet)))
        )
        ;; Validations
        (asserts! (get settled pool) ERR-NOT-SETTLED)
        (asserts! (not (has-claimed pool-id claimer)) ERR-ALREADY-CLAIMED)
        (asserts! (> user-winning-bet u0) ERR-NO-WINNINGS)
        (asserts! (> winning-pool u0) ERR-NO-WINNINGS)

        ;; Calculate share: (user_bet * net_pool) / winning_pool
        (let ((share (/ (* user-winning-bet net-pool) winning-pool)))
            ;; Transfer winnings to user
            (try! (transfer-from-contract token-type share claimer))

            ;; Mark as claimed
            (map-set claims { pool-id: pool-id, user: claimer } true)

            ;; Emit event
            (print {
                event: "winnings-claimed",
                pool-id: pool-id,
                user: claimer,
                amount: share,
                token-type: token-type
            })

            (ok share)
        )
    )
)

;; Claim deposit after pool is settled (for pool creators)
(define-public (claim-deposit (pool-id uint))
    (let 
        (
            (pool (unwrap! (map-get? pools { pool-id: pool-id }) ERR-POOL-NOT-FOUND))
            (token-type (get token-type pool))
            (deposit-amount (get-pool-deposit token-type))
            (creator (get creator pool))
        )
        ;; Only creator can claim deposit
        (asserts! (is-eq tx-sender creator) ERR-UNAUTHORIZED)
        ;; Pool must be settled
        (asserts! (get settled pool) ERR-NOT-SETTLED)
        ;; Deposit not already claimed
        (asserts! (not (get deposit-claimed pool)) ERR-DEPOSIT-ALREADY-CLAIMED)

        ;; Transfer deposit back to creator
        (try! (transfer-from-contract token-type deposit-amount creator))

        ;; Mark deposit as claimed
        (map-set pools
            { pool-id: pool-id }
            (merge pool { deposit-claimed: true })
        )

        ;; Emit event
        (print {
            event: "deposit-claimed",
            pool-id: pool-id,
            creator: creator,
            amount: deposit-amount,
            token-type: token-type
        })

        (ok deposit-amount)
    )
)

;; Request refund for expired unsettled pool
(define-public (request-refund (pool-id uint))
    (let 
        (
            (claimer tx-sender)
            (pool (unwrap! (map-get? pools { pool-id: pool-id }) ERR-POOL-NOT-FOUND))
            (token-type (get token-type pool))
            (user-bet (unwrap! (map-get? user-bets { pool-id: pool-id, user: claimer }) ERR-NO-WINNINGS))
            (refund-amount (+ (get amount-a user-bet) (get amount-b user-bet)))
        )
        ;; Pool must be expired
        (asserts! (> stacks-block-height (get expiry pool)) ERR-POOL-NOT-EXPIRED)
        ;; Pool must not be settled
        (asserts! (not (get settled pool)) ERR-POOL-SETTLED)
        ;; Not already refunded
        (asserts! (not (has-refunded pool-id claimer)) ERR-ALREADY-CLAIMED)
        ;; Must have bet
        (asserts! (> refund-amount u0) ERR-NO-WINNINGS)

        ;; Transfer refund to user
        (try! (transfer-from-contract token-type refund-amount claimer))

        ;; Mark as refunded
        (map-set refunds { pool-id: pool-id, user: claimer } true)

        ;; Emit event
        (print {
            event: "refund-claimed",
            pool-id: pool-id,
            user: claimer,
            amount: refund-amount,
            token-type: token-type
        })

        (ok refund-amount)
    )
)

;; Note: Deposit is NOT returned for abandoned pools - this incentivizes proper settlement
