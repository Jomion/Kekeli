// Ouvre/ferme le menu hamburger - utilisé sur toutes les pages
document.addEventListener('DOMContentLoaded', () => {
  const bouton = document.getElementById('menuToggle');
  const menu = document.getElementById('menu');

  if (bouton && menu) {
    bouton.addEventListener('click', () => {
      menu.classList.toggle('ouvert');
    });
  }
});
