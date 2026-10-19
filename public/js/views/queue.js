/**
 * OmniStudio v7 — Content Pipeline Queue View
 * Consolidated into Agent 2: Watchtower & Pipeline Engine (Stage 4: Review & Staged)
 */
window.queueView = (function() {
  async function render() {
    // Automatically redirect to unified Watchtower Pipeline Review Stage
    if (window.app) {
      window.app.navigate('watchtower');
      if (window.watchtowerView) {
        window.watchtowerView.switchStage('review');
      }
    }
  }

  return {
    render,
    switchTab: (tab) => {
      window.watchtowerView?.switchStage(tab === 'review' ? 'review' : (tab === 'failed' ? 'failed' : 'active'));
    },
    approveJob: (id) => window.watchtowerView?.approveJob(id),
    deleteJob: (id) => window.watchtowerView?.deleteJob(id),
    retryJob: (id) => window.watchtowerView?.retryJob(id),
    onCaptionInput: (id) => window.watchtowerView?.onCaptionInput(id),
    refresh: () => window.watchtowerView?.refresh()
  };
})();
