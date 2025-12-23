;; Stacks Prediction Market - Binary Options on BTC Price
;; Users bet STX on whether BTC price goes UP or DOWN

;; Constants
(define-constant CONTRACT_OWNER tx-sender)
(define-constant ERR_NOT_AUTHORIZED (err u100))
(define-constant ERR_ROUND_NOT_FOUND (err u101))
(define-constant ERR_ROUND_NOT_OPEN (err u102))
(define-constant ERR_ROUND_NOT_ENDED (err u103))
(define-constant ERR_ROUND_NOT_RESOLVED (err u104))
(define-constant ERR_ALREADY_BET (err u105))
(define-constant ERR_INVALID_AMOUNT (err u106))
(define-constant ERR_INVALID_DIRECTION (err u107))
(define-constant ERR_NO_WINNINGS (err u108))
(define-constant ERR_ALREADY_CLAIMED (err u109))

;; Round status: 0 = not started, 1 = open, 2 = closed, 3 = resolved
(define-constant STATUS_NOT_STARTED u0)
(define-constant STATUS_OPEN u1)
(define-constant STATUS_CLOSED u2)
(define-constant STATUS_RESOLVED u3)

;; Direction: 0 = DOWN, 1 = UP
(define-constant DIRECTION_DOWN u0)
(define-constant DIRECTION_UP u1)

;; Data Variables
(define-data-var current-round-id uint u0)

;; Data Maps
(define-map rounds uint {
    status: uint,
    start-price: uint,
    end-price: uint,
    pool-up: uint,
    pool-down: uint,
    winning-direction: uint,
    start-block: uint,
    end-block: uint
})

(define-map bets { round-id: uint, user: principal } {
    direction: uint,
    amount: uint,
    claimed: bool
})

;; Read-only Functions
(define-read-only (get-current-round-id)
    (var-get current-round-id)
)

(define-read-only (get-round (round-id uint))
    (map-get? rounds round-id)
)

(define-read-only (get-bet (round-id uint) (user principal))
    (map-get? bets { round-id: round-id, user: user })
)

(define-read-only (get-round-pools (round-id uint))
    (match (map-get? rounds round-id)
        round { pool-up: (get pool-up round), pool-down: (get pool-down round) }
        { pool-up: u0, pool-down: u0 }
    )
)

;; Admin Functions

;; Start a new betting round
(define-public (start-round (start-price uint))
    (let
        (
            (new-round-id (+ (var-get current-round-id) u1))
        )
        (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_NOT_AUTHORIZED)
        
        ;; Create new round
        (map-set rounds new-round-id {
            status: STATUS_OPEN,
            start-price: start-price,
            end-price: u0,
            pool-up: u0,
            pool-down: u0,
            winning-direction: u0,
            start-block: block-height,
            end-block: u0
        })
        
        ;; Update current round id
        (var-set current-round-id new-round-id)
        
        ;; Emit event for Chainhooks
        (print {
            event: "round-started",
            round-id: new-round-id,
            start-price: start-price,
            start-block: block-height
        })
        
        (ok new-round-id)
    )
)

;; End betting period for a round
(define-public (end-round (round-id uint))
    (let
        (
            (round (unwrap! (map-get? rounds round-id) ERR_ROUND_NOT_FOUND))
        )
        (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_NOT_AUTHORIZED)
        (asserts! (is-eq (get status round) STATUS_OPEN) ERR_ROUND_NOT_OPEN)
        
        ;; Update round status
        (map-set rounds round-id (merge round {
            status: STATUS_CLOSED,
            end-block: block-height
        }))
        
        ;; Emit event for Chainhooks
        (print {
            event: "round-ended",
            round-id: round-id,
            end-block: block-height,
            pool-up: (get pool-up round),
            pool-down: (get pool-down round)
        })
        
        (ok true)
    )
)

;; Resolve round with final price
(define-public (resolve-round (round-id uint) (end-price uint))
    (let
        (
            (round (unwrap! (map-get? rounds round-id) ERR_ROUND_NOT_FOUND))
            (winning-dir (if (> end-price (get start-price round)) DIRECTION_UP DIRECTION_DOWN))
        )
        (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_NOT_AUTHORIZED)
        (asserts! (is-eq (get status round) STATUS_CLOSED) ERR_ROUND_NOT_ENDED)
        
        ;; Update round with resolution
        (map-set rounds round-id (merge round {
            status: STATUS_RESOLVED,
            end-price: end-price,
            winning-direction: winning-dir
        }))
        
        ;; Emit event for Chainhooks
        (print {
            event: "round-resolved",
            round-id: round-id,
            start-price: (get start-price round),
            end-price: end-price,
            winning-direction: winning-dir,
            pool-up: (get pool-up round),
            pool-down: (get pool-down round)
        })
        
        (ok winning-dir)
    )
)

;; User Functions

;; Place a bet on a round
;; direction: 0 = DOWN, 1 = UP
(define-public (place-bet (round-id uint) (direction uint) (amount uint))
    (let
        (
            (round (unwrap! (map-get? rounds round-id) ERR_ROUND_NOT_FOUND))
            (existing-bet (map-get? bets { round-id: round-id, user: tx-sender }))
        )
        ;; Validations
        (asserts! (is-eq (get status round) STATUS_OPEN) ERR_ROUND_NOT_OPEN)
        (asserts! (is-none existing-bet) ERR_ALREADY_BET)
        (asserts! (> amount u0) ERR_INVALID_AMOUNT)
        (asserts! (or (is-eq direction DIRECTION_UP) (is-eq direction DIRECTION_DOWN)) ERR_INVALID_DIRECTION)
        
        ;; Transfer STX to contract
        (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))
        
        ;; Record bet
        (map-set bets { round-id: round-id, user: tx-sender } {
            direction: direction,
            amount: amount,
            claimed: false
        })
        
        ;; Update pool
        (if (is-eq direction DIRECTION_UP)
            (map-set rounds round-id (merge round { pool-up: (+ (get pool-up round) amount) }))
            (map-set rounds round-id (merge round { pool-down: (+ (get pool-down round) amount) }))
        )
        
        ;; Emit event for Chainhooks - CRITICAL for indexing
        (print {
            event: "bet-placed",
            round-id: round-id,
            user: tx-sender,
            direction: direction,
            amount: amount,
            direction-label: (if (is-eq direction DIRECTION_UP) "UP" "DOWN")
        })
        
        (ok true)
    )
)

;; Claim winnings from a resolved round
(define-public (claim-winnings (round-id uint))
    (let
        (
            (round (unwrap! (map-get? rounds round-id) ERR_ROUND_NOT_FOUND))
            (bet (unwrap! (map-get? bets { round-id: round-id, user: tx-sender }) ERR_NO_WINNINGS))
            (winning-pool (if (is-eq (get winning-direction round) DIRECTION_UP) 
                             (get pool-up round) 
                             (get pool-down round)))
            (losing-pool (if (is-eq (get winning-direction round) DIRECTION_UP) 
                            (get pool-down round) 
                            (get pool-up round)))
            (total-pool (+ (get pool-up round) (get pool-down round)))
            (user-share (/ (* (get amount bet) total-pool) winning-pool))
        )
        ;; Validations
        (asserts! (is-eq (get status round) STATUS_RESOLVED) ERR_ROUND_NOT_RESOLVED)
        (asserts! (not (get claimed bet)) ERR_ALREADY_CLAIMED)
        (asserts! (is-eq (get direction bet) (get winning-direction round)) ERR_NO_WINNINGS)
        
        ;; Mark as claimed
        (map-set bets { round-id: round-id, user: tx-sender } (merge bet { claimed: true }))
        
        ;; Transfer winnings
        (try! (as-contract (stx-transfer? user-share tx-sender tx-sender)))
        
        ;; Emit event for Chainhooks
        (print {
            event: "winnings-claimed",
            round-id: round-id,
            user: tx-sender,
            amount: user-share
        })
        
        (ok user-share)
    )
)
