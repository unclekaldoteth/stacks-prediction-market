;; Mock USDCx Token for Testing
;; Implements SIP-010 Fungible Token Trait
;; This is only for local testing with Clarinet - DO NOT deploy to mainnet/testnet

;; ============================================
;; SIP-010 TRAIT DEFINITION
;; ============================================

(define-trait sip-010-trait
    (
        ;; Transfer from the caller to a new principal
        (transfer (uint principal principal (optional (buff 34))) (response bool uint))
        
        ;; Get the token name
        (get-name () (response (string-ascii 32) uint))
        
        ;; Get the token symbol
        (get-symbol () (response (string-ascii 32) uint))
        
        ;; Get the number of decimals used
        (get-decimals () (response uint uint))
        
        ;; Get the balance of the specified principal
        (get-balance (principal) (response uint uint))
        
        ;; Get the total supply
        (get-total-supply () (response uint uint))
        
        ;; Get the token URI
        (get-token-uri () (response (optional (string-utf8 256)) uint))
    )
)

;; ============================================
;; TOKEN IMPLEMENTATION
;; ============================================

(define-constant CONTRACT-OWNER tx-sender)

;; Error codes
(define-constant ERR-NOT-AUTHORIZED (err u401))
(define-constant ERR-INSUFFICIENT-BALANCE (err u402))

;; Token metadata
(define-constant TOKEN-NAME "Mock USDCx")
(define-constant TOKEN-SYMBOL "mUSDCx")
(define-constant TOKEN-DECIMALS u6)

;; Token data
(define-fungible-token mock-usdcx)
(define-data-var token-uri (optional (string-utf8 256)) (some u"https://example.com/mock-usdcx"))

;; ============================================
;; SIP-010 REQUIRED FUNCTIONS
;; ============================================

(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
    (begin
        (asserts! (or (is-eq tx-sender sender) (is-eq contract-caller sender)) ERR-NOT-AUTHORIZED)
        (try! (ft-transfer? mock-usdcx amount sender recipient))
        (match memo to-print (print to-print) 0x)
        (ok true)
    )
)

(define-read-only (get-name)
    (ok TOKEN-NAME)
)

(define-read-only (get-symbol)
    (ok TOKEN-SYMBOL)
)

(define-read-only (get-decimals)
    (ok TOKEN-DECIMALS)
)

(define-read-only (get-balance (who principal))
    (ok (ft-get-balance mock-usdcx who))
)

(define-read-only (get-total-supply)
    (ok (ft-get-supply mock-usdcx))
)

(define-read-only (get-token-uri)
    (ok (var-get token-uri))
)

;; ============================================
;; TEST HELPER FUNCTIONS
;; ============================================

;; Mint tokens for testing (anyone can mint in test environment)
(define-public (mint (amount uint) (recipient principal))
    (ft-mint? mock-usdcx amount recipient)
)

;; Burn tokens
(define-public (burn (amount uint) (owner principal))
    (begin
        (asserts! (is-eq tx-sender owner) ERR-NOT-AUTHORIZED)
        (ft-burn? mock-usdcx amount owner)
    )
)
