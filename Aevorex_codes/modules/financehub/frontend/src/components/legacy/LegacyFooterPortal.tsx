import React, { useEffect } from "react";

export const LegacyFooterPortal = () => {
  useEffect(() => {
    const footerId = "app-footer";
    let footer = document.getElementById(footerId);
    if (!footer) {
      footer = document.createElement("footer");
      footer.id = footerId;
      footer.className = "fh-footer app-footer";
      footer.innerHTML = `
        <div class="fh-footer__container">
          <div class="fh-footer__content">
            <div class="fh-footer__section fh-footer__section--brand">
              <div class="fh-footer__brand">
                <div class="fh-footer__brand-logo">AE</div>
                <h3 class="fh-footer__brand-name">FinanceHub</h3>
              </div>
              <p class="fh-footer__brand-tagline">Premium Equity Research Platform</p>
            </div>
            <div class="fh-footer__section">
              <h4 class="fh-footer__title">Platform</h4>
              <ul class="fh-footer__links"><li><a href="#" class="fh-footer__link">Features</a></li><li><a href="#" class="fh-footer__link">API</a></li><li><a href="#" class="fh-footer__link">Documentation</a></li></ul>
            </div>
            <div class="fh-footer__section">
              <h4 class="fh-footer__title">Support</h4>
              <ul class="fh-footer__links"><li><a href="#" class="fh-footer__link">Help Center</a></li><li><a href="#" class="fh-footer__link">Contact</a></li><li><a href="#" class="fh-footer__link">Status</a></li></ul>
            </div>
            <div class="fh-footer__section">
              <h4 class="fh-footer__title">Company</h4>
              <ul class="fh-footer__links"><li><a href="#" class="fh-footer__link">About</a></li><li><a href="#" class="fh-footer__link">Careers</a></li><li><a href="#" class="fh-footer__link">Blog</a></li></ul>
            </div>
          </div>
          <div class="fh-footer__bottom">
            <p class="fh-footer__copyright">© 2025 Aevorex FinanceHub. All rights reserved.</p>
            <ul class="fh-footer__legal"><li><a href="#" class="fh-footer__legal-link">Terms</a></li><li><a href="#" class="fh-footer__legal-link">Privacy</a></li><li><a href="#" class="fh-footer__legal-link">Cookies</a></li></ul>
          </div>
        </div>`;
      document.body.appendChild(footer);
    }
  }, []);

  return null;
};
