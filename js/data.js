/*
 * ============================================================
 *  DADOS DO SITE — EDITE AQUI
 * ============================================================
 *  ATENÇÃO: marca, sabores, preços, WhatsApp e Instagram abaixo
 *  são EXEMPLOS (placeholders). Troque pelos dados reais.
 *  Enquanto o WhatsApp for o número de exemplo, o botão
 *  "Finalizar pelo WhatsApp" avisa em vez de abrir uma conversa.
 *
 *  As batatas 3D são geradas em código (Three.js) com textura de foto.
 *  chipTint = tom da batata 3D desse sabor. As fotos (assets/img) são
 *  imagens genéricas do Pexels: troque pelas fotos reais dos produtos.
 *
 *  Campos de cada sabor:
 *    bg     = cor de fundo da seção desse sabor
 *    ink    = cor do texto sobre esse fundo
 *    bag    = cor de apoio (farelos)  bagInk = (reservado)
 *    accent = cor de destaque         photo  = arquivo em assets/img
 */
window.SITE = {
  brand: "Chip's",
  whatsapp: "5500000000000", // formato: 55 + DDD + número (somente dígitos)
  instagramUrl: "https://www.instagram.com/",
  instagramHandle: "@chips",
  currency: "BRL",
  products: [
    { id: "original", chipTint: "#ffffff", name: "Original", desc: "Sequinha, sal na medida e crocância que estala.", price: 12.9, size: "100 g",
      bg: "#ffcf1f", ink: "#16110a", bag: "#e8261b", bagInk: "#ffe14d", accent: "#16110a", photo: "macro", tag: "Clássica" },
    { id: "churrasco", chipTint: "#ff9566", name: "Churrasco", desc: "Tempero defumado com cara de domingo de brasa.", price: 13.9, size: "100 g",
      bg: "#e8261b", ink: "#fff3cf", bag: "#16110a", bagInk: "#ffcf1f", accent: "#ffcf1f", photo: "seasoned", tag: "Mais pedida" },
    { id: "cebola-salsa", chipTint: "#d9f7a8", name: "Cebola & Salsa", desc: "Fresquinha, aromática e impossível de largar.", price: 13.9, size: "100 g",
      bg: "#17a25a", ink: "#fffbe0", bag: "#ffcf1f", bagInk: "#0f5c31", accent: "#ffe14d", photo: "bag", tag: "Fresquinha" },
    { id: "pimenta", chipTint: "#ff6a4a", name: "Pimenta", desc: "Esquenta na segunda mordida. Pra quem gosta de ardência.", price: 14.5, size: "100 g",
      bg: "#16110a", ink: "#ffcf1f", bag: "#ff4a1c", bagInk: "#fff3cf", accent: "#ff4a1c", photo: "plate", tag: "Picante" },
    { id: "queijo", chipTint: "#ffc562", name: "Queijo", desc: "Cobertura cremosa de queijo em cada ondinha.", price: 13.9, size: "100 g",
      bg: "#ff8a1f", ink: "#16110a", bag: "#ffcf1f", bagInk: "#b91810", accent: "#fff3cf", photo: "pile", tag: "Cremosa" },
    { id: "sour-cream", chipTint: "#fff3d6", name: "Sour Cream", desc: "Azedinho suave que vicia sem você perceber.", price: 14.5, size: "100 g",
      bg: "#fff3cf", ink: "#b91810", bag: "#ff8a1f", bagInk: "#16110a", accent: "#e8261b", photo: "bag2", tag: "Cremosa" }
  ]
};
