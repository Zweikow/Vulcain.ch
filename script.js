// Configuration EmailJS
const EMAILJS_CONFIG = {
    serviceId: 'service_ym7dhd8',
    templateId: 'template_3406zs1',
    publicKey: 'sfjVx4tbXOCif1TVh'
};

// Adresse e-mail du préparateur de commande
const ADMIN_EMAIL = 'commandes@cidrerie-vulcain.ch';

// Configuration pour génération PDF factures
const INVOICE_CONFIG = {
    companyName: 'Cidrerie du Vulcain',
    companyAddress: 'Adresse de la cidrerie\n1234 Lieu, Suisse',
    companyPhone: '076 830 62 15',
    companyEmail: 'commandes@cidrerie-vulcain.ch',
    taxRate: 0.077 // TVA Suisse 7.7%
};

// Catalogue des produits
const PRODUITS = {
    cidres: [
        { id: 'poire-la-premoudiere', nom: 'Poiré La Prémoudière', prix: 20, description: 'juteux, sec' },
        { id: '3-pepins-23', nom: '3 Pépins 2023', prix: 18, description: 'Extra brut, vineux' },
        { id: 'lande-foy-22', nom: 'Lande Foy 2022', prix: 12, description: 'Brut, fruité' },
        { id: 'belle-brutale-17', nom: 'Belle Brutale 2017', prix: 18, description: 'Sec, fruité, acidulée' },
        { id: 'brute-bestiale-17', nom: 'Brute Bestiale 2017', prix: 18, description: 'Sec, épicé et amertume' },
        { id: 'turgowy-19', nom: 'Turgowy 2019', prix: 15, description: 'Sec, fruité et acidulé' },
        { id: 'turgowy-20', nom: 'Turgowy 2020', prix: 15, description: 'Sec plus rond – florale' },
        { id: 'brute-de-rue-20', nom: 'Brute de Rue 2020', prix: 16, description: 'Sec, belles amertumes – épicée' },
        { id: 'fer-20', nom: 'Fer 2020', prix: 15, description: 'Acidulée, florale – fruité évoluée' },
        { id: 'fribourgeoise-21', nom: 'Fribourgeoise 2021', prix: 15, description: 'Demi-sec, fruité et notes safranées' },
        { id: 'premiers-emois-21', nom: 'Premiers Emois 2021', prix: 16, description: 'Demi-sec, très fruité, long en bouche et dense' },
        { id: 'brute-de-rue-21', nom: 'Brute de Rue 2021', prix: 16, description: 'Sec, dense, beaux amers' },
        { id: 'a-propos-dailes-21', nom: 'A propos d’Ailes 2021', prix: 19, description: 'Demi-sec, très fruité, notes épices - safran' },
        { id: '4-pepins-22', nom: '4 Pépins 2022', prix: 22, description: 'Sec – belle rondeur sur le fruit – complexité grâce aux coings' },
        { id: 'brute-de-rue-22', nom: 'Brute de Rue 2022', prix: 16, description: 'Sec, plus rond que 20 et 21, riche et belle matière, amer souple' },
        { id: 'turgowy-23', nom: 'Turgowy 2023', prix: 15, description: 'Très sec, désaltérant, acidité – florale – sapide' },
        { id: 'baie-de-rue-23', nom: 'Baie de Rue 2023', prix: 16, description: 'Sec, moins de pommes amers, fraîche et florale' },
        { id: '4-pepins-23', nom: '4 Pépins 2023', prix: 22, description: 'Sec, plus léger que 2022, notes de pinot noir plus marquées' },
        { id: '3-pepins-2010', nom: '3 Pépins 2010', prix: 30, description: 'Extra brut, évolué, fruits très murs, belle longueur (144 bouteilles)' }
    ],
    eauxDeVie: [
        { id: 'cidre-glace-12', nom: 'Cidre Glace 2012', prix: 50, description: 'Liquoreux sur l’acidité, tourbé et notes de tabac' },
        { id: 'botsi-glace-17', nom: 'Botsi de glace 2017', prix: 28, description: 'Liquoreux de poires à Botsi, fumé et notes de beurre et noisettes, légère oxydation' },
        { id: 'poire-fondue-non-etiq', nom: 'Poiré Fondue – non étiq.', prix: 10, description: 'Sec, 2018, pour la cuisine' }
    ]
};

// Index des produits pour recherche rapide
let produitsData = {};

// Panier global
let panier = {};

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    initialiserProduits();
    initialiserEmailJS();
    genererCatalogue();
    initialiserPanier();
    initialiserFormulaire();
    initialiserModal();
});

// Créer l'index des produits
function initialiserProduits() {
    Object.values(PRODUITS).forEach(categorie => {
        categorie.forEach(produit => {
            produitsData[produit.id] = produit;
        });
    });
}

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
    if (!container) return;

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
            <input type="number" id="qty-${produit.id}" class="quantity-input" value="0" min="0" onchange="modifierQuantite('${produit.id}', 0, this.value)">
            <button class="btn-quantity" onclick="modifierQuantite('${produit.id}', 1)">+</button>
        </div>
    `;
    return div;
}

function mettreAJourPanier() {
    const panierItems = document.getElementById('panier-items');
    const sousTotal = document.getElementById('sous-total');
    const livraison = document.getElementById('livraison');
    const total = document.getElementById('total');
    const warnings = document.getElementById('panier-warnings');

    if (!panierItems) return;

    // Calculer le total
    let totalProduits = 0;
    let totalBouteilles = 0;

    Object.entries(panier).forEach(([id, quantite]) => {
        const produit = produitsData[id];
        if (produit) {
            totalProduits += produit.prix * quantite;
            totalBouteilles += quantite;
        }
    });

    // Calculer les frais de livraison
    let fraisLivraison = 0;
    if (totalBouteilles > 0) {
        fraisLivraison = totalBouteilles >= 24 ? 0 : 10;
    }
    const totalGeneral = totalProduits + fraisLivraison;

    // Mettre à jour l'affichage
    sousTotal.textContent = `${totalProduits.toFixed(2)} CHF`;
    livraison.textContent = fraisLivraison === 0 && totalBouteilles > 0 ? 'Gratuit' : `${fraisLivraison.toFixed(2)} CHF`;
    total.textContent = `${totalGeneral.toFixed(2)} CHF`;

    // Afficher les articles du panier
    if (Object.keys(panier).length === 0) {
        panierItems.innerHTML = '<p class="empty-cart">Votre panier est vide</p>';
    } else {
        panierItems.innerHTML = Object.entries(panier).map(([id, quantite]) => {
            const produit = produitsData[id];
            if (!produit) return '';
            return `
                <div class="panier-item">
                    <div class="item-info">
                        <span class="item-name">${produit.nom} ${produit.annee ? `(${produit.annee})` : ''}</span>
                        <span class="item-price">${produit.prix.toFixed(2)} CHF × ${quantite}</span>
                    </div>
                    <div class="item-total">${(produit.prix * quantite).toFixed(2)} CHF</div>
                </div>
            `;
        }).join('');
    }

    // Afficher les avertissements
    afficherAvertissements(totalBouteilles, fraisLivraison);
}

function afficherAvertissements(totalBouteilles, fraisLivraison) {
    const warnings = document.getElementById('panier-warnings');
    if (!warnings) return;

    let warningsHTML = '';

    if (totalBouteilles > 0 && totalBouteilles < 6) {
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

// Calculer le total (fonction nécessaire pour EmailJS)
function calculerTotal() {
    let totalProduits = 0;
    let totalBouteilles = 0;

    Object.entries(panier).forEach(([id, quantite]) => {
        const produit = produitsData[id];
        if (produit) {
            totalProduits += produit.prix * quantite;
            totalBouteilles += quantite;
        }
    });

    const fraisLivraison = totalBouteilles >= 24 ? 0 : (totalBouteilles > 0 ? 10 : 0);
    return totalProduits + fraisLivraison;
}

// Initialisation du panier
function initialiserPanier() {
    mettreAJourPanier();
}

// Gestion du formulaire
function initialiserFormulaire() {
    const formulaire = document.getElementById('commande-form');
    if (formulaire) {
        formulaire.addEventListener('submit', soumettreCommande);
    }
}

async function soumettreCommande(event) {
    event.preventDefault();

    // Vérifier que le panier n'est pas vide
    if (Object.keys(panier).length === 0) {
        alert('Veuillez ajouter des produits à votre panier avant de commander.');
        return;
    }

    // Afficher le loading
    const btnSubmit = document.getElementById('btn-submit');
    const btnText = btnSubmit?.querySelector('.btn-text');
    const btnLoading = btnSubmit?.querySelector('.btn-loading');

    if (btnText && btnLoading) {
        btnText.style.display = 'none';
        btnLoading.style.display = 'inline';
        btnSubmit.disabled = true;
    }

    try {
        // Envoyer l'email
        const formData = new FormData(event.target);
        await envoyerCommande(formData);

        // Afficher la confirmation
        afficherModalConfirmation();

        // Réinitialiser le formulaire
        reinitialiserFormulaire();

    } catch (error) {
        console.error('Erreur lors de l\'envoi:', error);
        alert('Une erreur est survenue lors de l\'envoi de votre commande. Veuillez réessayer.');
    } finally {
        // Restaurer le bouton
        if (btnText && btnLoading) {
            btnText.style.display = 'inline';
            btnLoading.style.display = 'none';
            btnSubmit.disabled = false;
        }
    }
}

// Fonction pour modifier la quantité d'un produit dans le panier
function modifierQuantite(id, delta, valeurDirecte) {
    if (!(id in produitsData)) return;

    // Récupérer l'input
    const input = document.getElementById(`qty-${id}`);
    if (!input) return;

    // Calculer la nouvelle quantité
    let nouvelleQuantite = (panier[id] || 0);
    if (typeof valeurDirecte !== 'undefined') {
        nouvelleQuantite = parseInt(valeurDirecte, 10) || 0;
    } else {
        nouvelleQuantite += delta;
    }

    // S'assurer que la quantité est valide
    if (nouvelleQuantite < 0) nouvelleQuantite = 0;

    // Mettre à jour le panier
    if (nouvelleQuantite === 0) {
        delete panier[id];
    } else {
        panier[id] = nouvelleQuantite;
    }

    // Mettre à jour l'affichage de l'input
    input.value = nouvelleQuantite;

    // Mettre à jour l'affichage du panier
    mettreAJourPanier();
}

// Solution HYBRIDE : FormSubmit (admin avec PDF) + EmailJS (client avec template)
async function envoyerCommande(formData) {
    try {
        // Préparer les données de commande
        const donneesCommande = {
            prenom: formData.get('prenom'),
            nom: formData.get('nom'),
            email: formData.get('email'),
            telephone: formData.get('telephone'),
            adresse: formData.get('adresse'),
            npa: formData.get('npa'),
            lieu: formData.get('lieu'),
            remarques: formData.get('remarques') || '',
            panier: {}
        };

        // Convertir le panier en format structuré
        Object.entries(panier).forEach(([id, quantite]) => {
            const produit = produitsData[id];
            if (produit) {
                donneesCommande.panier[id] = {
                    nom: produit.nom,
                    prix: produit.prix,
                    quantite: quantite
                };
            }
        });

        // Générer la facture PDF
        console.log('Génération de la facture PDF...');
        const resultPDF = await genererFacturePDF(donneesCommande);
        const pdfBlob = resultPDF.pdf.output('blob');
        const pdfBase64 = resultPDF.pdf.output('datauristring').split(',')[1];

        // Format texte simple pour l'email
        const panierTexte = Object.entries(panier)
            .map(([id, quantite]) => {
                const produit = produitsData[id];
                if (!produit) return '';
                const sousTotal = (produit.prix * quantite).toFixed(2);
                return `• ${produit.nom}
  ${quantite}x à ${produit.prix.toFixed(2)} CHF = ${sousTotal} CHF`;
            })
            .filter(ligne => ligne !== '')
            .join('\n\n');

        // Générer date et heure actuelles
        const now = new Date();
        const dateStr = now.toLocaleDateString('fr-CH');
        const heureStr = now.toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' });

        // === SOLUTION HYBRIDE ===
        
        // 📧 ÉTAPE 1: Envoyer à L'ADMIN via FormSubmit (avec PDF en pièce jointe)
        console.log('📧 Envoi à l\'admin via FormSubmit avec PDF...');
        await envoyerViaFormSubmit(donneesCommande, panierTexte, resultPDF.numeroFacture, pdfBlob);
        
        // 📧 ÉTAPE 2: Envoyer confirmation au CLIENT via EmailJS (beau template HTML)
        console.log('📧 Envoi confirmation client via EmailJS...');
        await envoyerConfirmationClient(donneesCommande, panierTexte, resultPDF.numeroFacture, dateStr, heureStr);

        console.log(`✅ SUCCÈS! Commande ${resultPDF.numeroFacture} traitée:
        → Admin: FormSubmit (PDF joint) ✅ 
        → Client: EmailJS (template HTML) ✅`);
        
    } catch (error) {
        console.error('Erreur lors de l\'envoi de la commande:', error);
        throw error;
    }
}

// 📧 FONCTION 1: Envoyer à l'admin via FormSubmit (avec PDF)
async function envoyerViaFormSubmit(donneesCommande, panierTexte, numeroFacture, pdfBlob) {
    try {
        const formData = new FormData();
        
        // Configuration FormSubmit
        formData.append('access_key', 'YOUR_FORMSUBMIT_KEY'); // À remplacer par ta clé
        formData.append('subject', `🍎 Nouvelle commande Cidrerie du Vulcain #${numeroFacture}`);
        formData.append('from_name', `${donneesCommande.prenom} ${donneesCommande.nom}`);
        formData.append('reply_to', donneesCommande.email);
        
        // Contenu de l'email pour l'admin
        const messageAdmin = `
📋 NOUVELLE COMMANDE #${numeroFacture}

👤 CLIENT:
${donneesCommande.prenom} ${donneesCommande.nom}
📧 ${donneesCommande.email}
📞 ${donneesCommande.telephone}
🏠 ${donneesCommande.adresse}, ${donneesCommande.npa} ${donneesCommande.lieu}

🛒 COMMANDE:
${panierTexte}

💬 REMARQUES:
${donneesCommande.remarques || 'Aucune remarque'}

📎 La facture PDF détaillée est jointe à cet email.
        `;
        
        formData.append('message', messageAdmin);
        
        // Joindre le PDF
        formData.append('attachment', pdfBlob, `Facture_${numeroFacture}.pdf`);
        
        // Options FormSubmit pour éviter la redirection
        formData.append('_next', 'https://formsubmit.co/thanks.html');
        formData.append('_captcha', 'false');
        formData.append('_template', 'table');
        
        // Envoyer à FormSubmit
        const response = await fetch('https://formsubmit.co/commandes@cidrerie-vulcain.ch', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`FormSubmit error: ${response.status}`);
        }
        
        console.log('✅ Email admin envoyé via FormSubmit');
        
    } catch (error) {
        console.error('❌ Erreur FormSubmit:', error);
        throw error;
    }
}

// 📧 FONCTION 2: Envoyer confirmation client via EmailJS (template HTML)
async function envoyerConfirmationClient(donneesCommande, panierTexte, numeroFacture, dateStr, heureStr) {
    try {
        const templateParams = {
            // Informations client
            prenom: donneesCommande.prenom,
            nom: donneesCommande.nom,
            email: donneesCommande.email,
            telephone: donneesCommande.telephone,
            adresse: donneesCommande.adresse,
            npa: donneesCommande.npa,
            lieu: donneesCommande.lieu,
            remarques: donneesCommande.remarques || 'Aucune remarque',
            
            // Informations commande
            panier: panierTexte,
            total: calculerTotal().toFixed(2),
            order_id: numeroFacture,
            subject: `Confirmation de commande #${numeroFacture} - Cidrerie du Vulcain`,
            
            // Date et heure
            date: dateStr,
            heure: heureStr,
            timestamp: numeroFacture,
            
            // Informations expéditeur
            from_name: "Cidrerie du Vulcain",
            from_email: "commandes@cidrerie-vulcain.ch",
            reply_to: "commandes@cidrerie-vulcain.ch"
        };

        // Envoyer via EmailJS (sans pièce jointe)
        await emailjs.send(
            EMAILJS_CONFIG.serviceId,
            EMAILJS_CONFIG.templateId,
            templateParams
        );
        
        console.log('✅ Confirmation client envoyée via EmailJS');
        
    } catch (error) {
        console.error('❌ Erreur EmailJS:', error);
        throw error;
    }
}

function afficherModalConfirmation() {
    const modal = document.getElementById('modal-confirmation');
    if (modal) {
        modal.style.display = 'block';
    }
}

function closeModal() {
    const modal = document.getElementById('modal-confirmation');
    if (modal) {
        modal.style.display = 'none';
    }
}

function reinitialiserFormulaire() {
    // Vider le panier
    panier = {};
    
    // Remettre tous les inputs à 0
    Object.values(PRODUITS).forEach(categorie => {
        categorie.forEach(produit => {
            const input = document.getElementById(`qty-${produit.id}`);
            if (input) input.value = 0;
        });
    });

    // Réinitialiser le formulaire
    const form = document.getElementById('commande-form');
    if (form) form.reset();

    // Mettre à jour l'affichage
    mettreAJourPanier();
}

// Gestion de la modal
function initialiserModal() {
    const modal = document.getElementById('modal-confirmation');
    const closeBtn = modal?.querySelector('.close');

    if (closeBtn) {
        closeBtn.onclick = closeModal;
    }

    window.onclick = function(event) {
        if (event.target === modal) {
            closeModal();
        }
    };
}

// Affichage de la phrase d'information en haut de page
window.addEventListener('DOMContentLoaded', function() {
    const info = document.createElement('div');
    info.className = 'info-banner';
    info.style.background = '#ffe4b2';
    info.style.color = '#8b4513';
    info.style.fontWeight = 'bold';
    info.style.textAlign = 'center';
    info.style.padding = '8px 50px';
    info.style.fontSize = 'clamp(0.75rem, 2vw, 1rem)';
    info.style.marginBottom = '18px';
    info.style.lineHeight = '1.2';
    info.style.whiteSpace = 'pre-wrap';
    info.style.position = 'relative';
    info.style.zIndex = '1';
    info.textContent = 'Panachage possible – minimum 6 bouteilles\nlivraison 10.- CHF, gratuit dès 24 bouteilles';
    document.body.prepend(info);
});

// ============= SYSTÈME DE GÉNÉRATION PDF FACTURE =============

/**
 * Génère un numéro de facture unique basé sur la date et l'heure
 */
function genererNumeroFacture() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    return `F${year}${month}${day}-${hours}${minutes}${seconds}`;
}

/**
 * Génère et retourne un PDF de facture
 */
async function genererFacturePDF(donneesCommande) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Configuration des couleurs et polices
    const couleurPrimaire = [74, 124, 89]; // Vert cidrerie
    const couleurSecondaire = [139, 69, 19]; // Brun terre
    
    // En-tête de la facture
    doc.setFontSize(20);
    doc.setTextColor(...couleurPrimaire);
    doc.text('🍎 CIDRERIE DU VULCAIN', 20, 20);
    
    // Informations entreprise
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(INVOICE_CONFIG.companyAddress, 20, 30);
    doc.text(`Tél: ${INVOICE_CONFIG.companyPhone}`, 20, 40);
    doc.text(`Email: ${INVOICE_CONFIG.companyEmail}`, 20, 45);
    
    // Numéro et date facture
    const numeroFacture = genererNumeroFacture();
    doc.setFontSize(14);
    doc.setTextColor(...couleurSecondaire);
    doc.text(`FACTURE N° ${numeroFacture}`, 120, 20);
    
    const dateFacture = new Date().toLocaleDateString('fr-CH');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Date: ${dateFacture}`, 120, 30);
    
    // Informations client
    doc.setFontSize(12);
    doc.setTextColor(...couleurPrimaire);
    doc.text('FACTURÉ À:', 20, 65);
    
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`${donneesCommande.prenom} ${donneesCommande.nom}`, 20, 75);
    doc.text(donneesCommande.adresse, 20, 82);
    doc.text(`${donneesCommande.npa} ${donneesCommande.lieu}`, 20, 89);
    doc.text(`Tél: ${donneesCommande.telephone}`, 20, 96);
    doc.text(`Email: ${donneesCommande.email}`, 20, 103);
    
    // Ligne de séparation
    doc.setDrawColor(...couleurPrimaire);
    doc.line(20, 115, 190, 115);
    
    // Tableau des produits
    const produitsTableau = [];
    let sousTotal = 0;
    
    Object.entries(donneesCommande.panier).forEach(([id, item]) => {
        const total = item.prix * item.quantite;
        sousTotal += total;
        
        produitsTableau.push([
            item.nom,
            item.quantite.toString(),
            `${item.prix.toFixed(2)} CHF`,
            `${total.toFixed(2)} CHF`
        ]);
    });
    
    // Configuration du tableau
    doc.autoTable({
        startY: 125,
        head: [['Produit', 'Qté', 'Prix unit.', 'Total']],
        body: produitsTableau,
        theme: 'grid',
        headStyles: {
            fillColor: couleurPrimaire,
            textColor: [255, 255, 255],
            fontStyle: 'bold'
        },
        bodyStyles: {
            textColor: [0, 0, 0]
        },
        alternateRowStyles: {
            fillColor: [245, 245, 220] // Beige clair
        },
        columnStyles: {
            0: { cellWidth: 80 },
            1: { cellWidth: 20, halign: 'center' },
            2: { cellWidth: 35, halign: 'right' },
            3: { cellWidth: 35, halign: 'right' }
        }
    });
    
    // Calculs finaux
    const fraisLivraison = 10.00;
    const totalHT = sousTotal + fraisLivraison;
    const tva = totalHT * INVOICE_CONFIG.taxRate;
    const totalTTC = totalHT + tva;
    
    // Totaux
    const tableauY = doc.lastAutoTable.finalY + 10;
    
    doc.setFontSize(10);
    doc.text('Sous-total produits:', 130, tableauY);
    doc.text(`${sousTotal.toFixed(2)} CHF`, 175, tableauY);
    
    doc.text('Frais de livraison:', 130, tableauY + 7);
    doc.text(`${fraisLivraison.toFixed(2)} CHF`, 175, tableauY + 7);
    
    doc.text('Total HT:', 130, tableauY + 14);
    doc.text(`${totalHT.toFixed(2)} CHF`, 175, tableauY + 14);
    
    doc.text(`TVA (${(INVOICE_CONFIG.taxRate * 100).toFixed(1)}%):`, 130, tableauY + 21);
    doc.text(`${tva.toFixed(2)} CHF`, 175, tableauY + 21);
    
    // Total final
    doc.setFontSize(12);
    doc.setTextColor(...couleurSecondaire);
    doc.text('TOTAL TTC:', 130, tableauY + 32);
    doc.text(`${totalTTC.toFixed(2)} CHF`, 175, tableauY + 32);
    
    // Informations de paiement
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text('Conditions de paiement: À réception', 20, tableauY + 50);
    doc.text('Livraison uniquement en Suisse 🇨🇭', 20, tableauY + 57);
    
    // Remarques client si présentes
    if (donneesCommande.remarques && donneesCommande.remarques.trim()) {
        doc.setFontSize(10);
        doc.setTextColor(...couleurPrimaire);
        doc.text('Remarques client:', 20, tableauY + 70);
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(9);
        const remarques = doc.splitTextToSize(donneesCommande.remarques, 170);
        doc.text(remarques, 20, tableauY + 77);
    }
    
    // Pied de page
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Merci pour votre confiance ! - Cidrerie du Vulcain', 20, 280);
    
    return {
        pdf: doc,
        numeroFacture: numeroFacture,
        totalTTC: totalTTC.toFixed(2)
    };
}
