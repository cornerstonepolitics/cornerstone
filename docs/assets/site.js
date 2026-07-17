(function () {
  const button = document.getElementById('copy-link');
  const status = document.getElementById('copy-status');
  if (!button || !status) return;

  function setStatus(message) {
    status.textContent = message;
    window.setTimeout(() => { status.textContent = ''; }, 2000);
  }

  function fallbackCopy(url) {
    const textarea = document.createElement('textarea');
    textarea.value = url;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      const copied = document.execCommand('copy');
      setStatus(copied ? 'Copied' : 'Press Ctrl+C');
    } catch (error) {
      setStatus('Press Ctrl+C');
    }
    textarea.remove();
  }

  button.addEventListener('click', function () {
    const url = window.location.origin + window.location.pathname;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url)
        .then(() => setStatus('Copied'))
        .catch(() => fallbackCopy(url));
    } else {
      fallbackCopy(url);
    }
  });
}());
