// Configuration EmailJS (à remplacer par vos vraies clés)
const EMAILJS_CONFIG = {
    serviceId: 'YOUR_SERVICE_ID',
    templateId: 'YOUR_TEMPLATE_ID',
    publicKey: 'YOUR_PUBLIC_KEY'
};

// Catalogue des produits
const PRODUITS = {
    cidres: [
        {
            id: 'belle-brutale',
            nom: 'Belle Brutale',
            annee: '2024',
            prix: 8.50,
            description: 'Cidre brut et authentique'
        },
        {
            id: 'brute-bestiale',
            nom: 'Brute Bestiale',
            annee: '2024',
            prix: 9.00,
            description: 'Cidre sauvage et puissant'
        },
        {
            id: 'turgowy',
            nom: 'Turgowy',
            annee: '2024',
            prix: 8.00,
            description: 'Cidre traditionnel'
        },
        {
            id: 'brute-de-rue',
            nom: 'Brute de Rue',
            annee: '2024',
            prix: 7.50,
            description: 'Cidre de caractère'
        },
        {
            id: 'douce-amere',
            nom: 'Douce Amère',
            annee: '2024',
            prix: 8.00,
            description: 'Cidre équilibré'
        },
        {
            id: 'sauvage',
            nom: 'Sauvage',
            annee: '2024',
            prix: 9.50,
            description: 'Cidre nature et sauvage'
        }
    ],
    eauxDeVie: [
        {
            id: 'eau-de-vie-poire',
            nom: 'Eau de vie de poire',
            annee: '2023',
            prix: 25.00,
            description: 'Distillée artisanalement'
        },
        {
            id: 'eau-de-vie-pomme',
            nom: 'Eau de vie de pomme',
            annee: '2023',
            prix: 25.00,
            description: 'Distillée artisanalement'
        },
        {
            id: 'liqueur-pomme',
            nom: 'Liqueur de pomme',
            annee: '2024',
            prix: 18.00,
            description: 'Liqueur douce et fruitée'
        },
        {
            id: 'cidre-cuisine',
            nom: 'Cidre de cuisine',
            annee: '2024',
            prix: 6.00,
            description: 'Pour vos préparations culinaires'
        }
    ]
};

// Panier global
let panier = {};

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    initialiserEmailJS();
    genererCatalogue();
    initialiserPanier();
    initialiserFormulaire();
});

// Initialisation EmailJS
function initialiserEmailJS() {
    if (EMAILJS_CONFIG.publicKey !== 'YOUR_PUBLIC_KEY') {
        emailjs.init(EMAILJS_CONFIG.publicKey);
    }
}

// Génération du catalogue
function genererCatalogue() {
    genererCategorieProduits('cidres', PRODUITS.cidres);
    genererCategorieProduits('eaux-de-vie', PRODUITS.eauxDeVie);
}

function genererCategorieProduits(containerId, produits) {
    const container = document.getElementById(containerId + '-grid');
    
    produits.forEach(produit => {
        const produitElement = creerElementProduit(produit);
        container.appendChild(produitElement);
    });
}

function creerElementProduit(produit) {
    const div = document.createElement('div');
    div.className = 'product-card';
    div.innerHTML = `
        <div class="product-info">
            <h4 class="product-name">${produit.nom}</h4>
            ${produit.annee ? `<span class="product-year">${produit.annee}</span>` : ''}
            <p class="product-description">${produit.description}</p>
            <div class="product-price">${produit.prix.toFixed(2)} CHF</div>
        </div>
        <div class="product-controls">
            <button class="btn-quantity" onclick="modifierQuantite('${produit.id}', -1)">-</button>
            <input type="number" 
                   id="qty-${produit.id}" 
                   class="quantity-input" 
                   value="0" 
                   min="0" 
                   max="99"
                   onchange="mettreAJourQuantite('${produit.id}', this.value)">
            <button class="btn-quantity" onclick="modifierQuantite('${produit.id}', 1)">+</button>
        </div>
    `;
    return div;
}

// Gestion du panier
function modifierQuantite(produitId, delta) {
    const input = document.getElementById(`qty-${produitId}`);
    const nouvelleQuantite = Math.max(0, parseInt(input.value) + delta);
    input.value = nouvelleQuantite;
    mettreAJourQuantite(produitId, nouvelleQuantite);
}

function mettreAJourQuantite(produitId, quantite) {
    const quantiteNum = parseInt(quantite) || 0;
    
    if (quantiteNum === 0) {
        delete panier[produitId];
    } else {
        // Trouver le produit dans toutes les catégories
        let produit = null;
        for (const categorie of Object.values(PRODUITS)) {
            produit = categorie.find(p => p.id === produitId);
            if (produit) break;
        }
        
        if (produit) {
            panier[produitId] = {
                ...produit,
                quantite: quantiteNum
            };
        }
    }
    
    mettreAJourPanier();
}

function mettreAJourPanier() {
    const panierItems = document.getElementById('panier-items');
    const sousTotal = document.getElementById('sous-total');
    const livraison = document.getElementById('livraison');
    const total = document.getElementById('total');
    const warnings = document.getElementById('panier-warnings');
    
    // Calculer le total
    let totalProduits = 0;
    let totalBouteilles = 0;
    
    Object.values(panier).forEach(item => {
        totalProduits += item.prix * item.quantite;
        totalBouteilles += item.quantite;
    });
    
    // Calculer les frais de livraison
    let fraisLivraison = 0;
    if (totalBouteilles > 0) {
        fraisLivraison = totalBouteilles >= 24 ? 0 : 10;
    }
    const totalGeneral = totalProduits + fraisLivraison;
    
    // Mettre à jour l'affichage
    sousTotal.textContent = `${totalProduits.toFixed(2)} CHF`;
    
    if (totalBouteilles === 0) {
        livraison.textContent = '0.00 CHF';
    } else {
        livraison.textContent = fraisLivraison === 0 ? 'Gratuit' : `${fraisLivraison.toFixed(2)} CHF`;
    }
    
    total.textContent = `${totalGeneral.toFixed(2)} CHF`;
    
    // Afficher les articles du panier
    if (Object.keys(panier).length === 0) {
        panierItems.innerHTML = '<p class="empty-cart">Votre panier est vide</p>';
    } else {
        panierItems.innerHTML = Object.values(panier).map(item => `
            <div class="panier-item">
                <div class="item-info">
                    <span class="item-name">${item.nom} ${item.annee ? `(${item.annee})` : ''}</span>
                    <span class="item-price">${item.prix.toFixed(2)} CHF × ${item.quantite}</span>
                </div>
                <div class="item-total">${(item.prix * item.quantite).toFixed(2)} CHF</div>
            </div>
        `).join('');
    }
    
    // Afficher les avertissements
    afficherAvertissements(totalBouteilles, fraisLivraison);
}

function afficherAvertissements(totalBouteilles, fraisLivraison) {
    const warnings = document.getElementById('panier-warnings');
    let warningsHTML = '';
    
    if (totalBouteilles === 0) {
        // Pas d'avertissements quand le panier est vide
        warningsHTML = '';
    } else if (totalBouteilles > 0 && totalBouteilles < 6) {
        warningsHTML += '<div class="warning">⚠️ Minimum 6 bouteilles recommandé</div>';
    }
    
    if (totalBouteilles > 0 && totalBouteilles < 24) {
        warningsHTML += `<div class="info">💡 ${24 - totalBouteilles} bouteilles supplémentaires pour la livraison gratuite</div>`;
    }
    
    if (totalBouteilles >= 24) {
        warningsHTML += '<div class="success">🎉 Livraison gratuite !</div>';
    }
    
    warnings.innerHTML = warningsHTML;
}

// Initialisation du panier
function initialiserPanier() {
    mettreAJourPanier();
}

// Gestion du formulaire
function initialiserFormulaire() {
    const formulaire = document.getElementById('commande-form');
    formulaire.addEventListener('submit', soumettreCommande);
}

async function soumettreCommande(event) {
    event.preventDefault();
    
    // Vérifier le honeypot
    const honeypot = document.querySelector('input[name="website"]');
    if (honeypot.value) {
        console.log('Spam détecté');
        return;
    }
    
    // Vérifier que le panier n'est pas vide
    if (Object.keys(panier).length === 0) {
        alert('Votre panier est vide. Veuillez ajouter des produits.');
        return;
    }
    
    // Vérifier la confirmation
    const confirmation = document.getElementById('confirmation');
    if (!confirmation.checked) {
        alert('Veuillez confirmer votre commande.');
        return;
    }
    
    // Afficher le loading
    const btnSubmit = document.getElementById('btn-submit');
    const btnText = btnSubmit.querySelector('.btn-text');
    const btnLoading = btnSubmit.querySelector('.btn-loading');
    
    btnText.style.display = 'none';
    btnLoading.style.display = 'inline';
    btnSubmit.disabled = true;
    
    try {
        // Préparer les données de la commande
        const donneesCommande = preparerDonneesCommande();
        
        // Envoyer l'email
        if (EMAILJS_CONFIG.publicKey !== 'YOUR_PUBLIC_KEY') {
            await envoyerEmail(donneesCommande);
        } else {
            // Mode développement - afficher les données dans la console
            console.log('Données de la commande:', donneesCommande);
            await new Promise(resolve => setTimeout(resolve, 2000)); // Simuler l'envoi
        }
        
        // Afficher la confirmation
        afficherModalConfirmation();
        
        // Réinitialiser le formulaire
        reinitialiserFormulaire();
        
    } catch (error) {
        console.error('Erreur lors de l\'envoi:', error);
        alert('Une erreur est survenue lors de l\'envoi de votre commande. Veuillez réessayer.');
    } finally {
        // Restaurer le bouton
        btnText.style.display = 'inline';
        btnLoading.style.display = 'none';
        btnSubmit.disabled = false;
    }
}

function preparerDonneesCommande() {
    const formData = new FormData(document.getElementById('commande-form'));
    const totalBouteilles = Object.values(panier).reduce((sum, item) => sum + item.quantite, 0);
    const totalProduits = Object.values(panier).reduce((sum, item) => sum + (item.prix * item.quantite), 0);
    const fraisLivraison = totalBouteilles >= 24 ? 0 : 10;
    const totalGeneral = totalProduits + fraisLivraison;
    
    return {
        // Informations client
        nom: formData.get('nom'),
        prenom: formData.get('prenom'),
        adresse: formData.get('adresse'),
        npa: formData.get('npa'),
        lieu: formData.get('lieu'),
        telephone: formData.get('telephone'),
        email: formData.get('email'),
        remarques: formData.get('remarques') || '',
        
        // Détails de la commande
        articles: Object.values(panier).map(item => ({
            nom: item.nom,
            annee: item.annee,
            prix: item.prix,
            quantite: item.quantite,
            total: item.prix * item.quantite
        })),
        
        // Totaux
        totalBouteilles: totalBouteilles,
        totalProduits: totalProduits,
        fraisLivraison: fraisLivraison,
        totalGeneral: totalGeneral,
        
        // Métadonnées
        date: new Date().toLocaleDateString('fr-FR'),
        heure: new Date().toLocaleTimeString('fr-FR')
    };
}

async function envoyerEmail(donnees) {
    const templateParams = {
        to_email: donnees.email,
        to_name: `${donnees.prenom} ${donnees.nom}`,
        ...donnees
    };
    
    await emailjs.send(
        EMAILJS_CONFIG.serviceId,
        EMAILJS_CONFIG.templateId,
        templateParams
    );
}

function afficherModalConfirmation() {
    const modal = document.getElementById('modal-confirmation');
    modal.style.display = 'block';
}

function closeModal() {
    const modal = document.getElementById('modal-confirmation');
    modal.style.display = 'none';
}

function reinitialiserFormulaire() {
    // Vider le panier
    panier = {};
    Object.keys(PRODUITS).forEach(categorie => {
        PRODUITS[categorie].forEach(produit => {
            const input = document.getElementById(`qty-${produit.id}`);
            if (input) input.value = 0;
        });
    });
    
    // Réinitialiser le formulaire
    document.getElementById('commande-form').reset();
    
    // Mettre à jour l'affichage
    mettreAJourPanier();
}

// Gestion de la modal
document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('modal-confirmation');
    const closeBtn = modal.querySelector('.close');
    
    closeBtn.onclick = closeModal;
    
    window.onclick = function(event) {
        if (event.target === modal) {
            closeModal();
        }
    };
});
