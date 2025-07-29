document.querySelectorAll('.copy-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    const id = this.dataset.id;
    const text = document.getElementById('shayari-text-' + id).innerText;
    navigator.clipboard.writeText(text)
      .then(() => {
        showToast('Copied to clipboard!');
      })
      .catch(() => showToast('Failed to copy!'));
  });
});
function showToast(msg) {
  let toast = document.createElement('div');
  toast.className = 'toast-message';
  toast.innerHTML = `<i class="bi bi-clipboard-check"></i> ${msg}`;
  document.body.appendChild(toast);
  setTimeout(() => { toast.remove(); }, 1500);
}
