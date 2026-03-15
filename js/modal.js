// Modal functionality
class Modal {
    constructor() {
        this.modals = document.querySelectorAll('.modal');
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Close modal on X button click
        document.querySelectorAll('.modal-close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                this.closeModal(e.target.closest('.modal'));
            });
        });

        // Close modal on outside click
        this.modals.forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal);
                }
            });
        });

        // Close modal on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });

        // Open modal on privacy link click
        document.querySelectorAll('.privacy-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const modalId = link.getAttribute('data-modal');
                this.openModal(document.getElementById(modalId));
            });
        });

        // Accept policy button
        document.querySelectorAll('.modal-accept').forEach(btn => {
            btn.addEventListener('click', () => {
                const modal = btn.closest('.modal');
                this.acceptPolicy(modal);
            });
        });

        // Form validation for privacy checkbox
        const privacyCheckbox = document.getElementById('privacy');
        const submitBtn = document.getElementById('submitBtn');

        if (privacyCheckbox && submitBtn) {
            privacyCheckbox.addEventListener('change', () => {
                submitBtn.disabled = !privacyCheckbox.checked;
            });
        }
    }

    openModal(modal) {
        if (modal) {
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }
    }

    closeModal(modal) {
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    }

    closeAllModals() {
        this.modals.forEach(modal => {
            this.closeModal(modal);
        });
    }

    acceptPolicy(modal) {
        const checkbox = document.getElementById('privacy');
        const submitBtn = document.getElementById('submitBtn');
        
        if (checkbox && submitBtn) {
            checkbox.checked = true;
            submitBtn.disabled = false;
        }
        
        this.closeModal(modal);
    }
}

// Initialize modal when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new Modal();
});