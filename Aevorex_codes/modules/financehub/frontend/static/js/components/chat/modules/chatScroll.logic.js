/**
 * AEVOREX FINANCEHUB - Chat Scroll Logic
 * Handles smart fixed positioning for chat input panel
 * Max 60 lines - Rule #008 compliant
 */

class ChatScrollManager {
  constructor() {
    this.chatContainer = null;
    this.inputContainer = null;
    this.footer = null;
    this.chatObserver = null;
    this.footerObserver = null;
    this.isFixed = false;
    
    this.init();
  }

  init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupObservers());
    } else {
      this.setupObservers();
    }
  }

  setupObservers() {
    this.chatContainer = document.querySelector('.fh-chat');
    this.inputContainer = document.querySelector('.fh-chat__input-container');
    this.footer = document.querySelector('footer');

    if (!this.chatContainer || !this.inputContainer) return;

    // Observer for chat visibility (threshold = 1 means fully visible)
    this.chatObserver = new IntersectionObserver(
      (entries) => this.handleChatVisibility(entries),
      { threshold: 1.0, rootMargin: '0px' }
    );

    // Observer for footer detection
    if (this.footer) {
      this.footerObserver = new IntersectionObserver(
        (entries) => this.handleFooterVisibility(entries),
        { threshold: 0, rootMargin: '0px 0px -50px 0px' }
      );
      this.footerObserver.observe(this.footer);
    }

    this.chatObserver.observe(this.chatContainer);
  }

  handleChatVisibility(entries) {
    const entry = entries[0];
    
    if (entry.isIntersecting && entry.intersectionRatio === 1) {
      // Chat is fully visible - enable fixed positioning
      this.setFixed(true);
    } else if (entry.intersectionRatio < 1 && this.isFixed) {
      // Chat is partially visible and was fixed - keep fixed until footer
      // This maintains fixed state while scrolling within chat
    }
  }

  handleFooterVisibility(entries) {
    const entry = entries[0];
    
    if (entry.isIntersecting && this.isFixed) {
      // Footer is visible - disable fixed positioning
      this.setFixed(false);
    }
  }

  setFixed(fixed) {
    if (this.isFixed === fixed) return;
    
    this.isFixed = fixed;
    this.inputContainer.classList.toggle('is-fixed', fixed);
  }
}

// Initialize when module loads
new ChatScrollManager(); 