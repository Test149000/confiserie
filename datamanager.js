//const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTthSOtgBLFpayGMbDQZ9DOwlMd12wpsfS7wBNZQ-W4QyRe-RPSf3hklALgTq_DiSdf6GvTUx7whi3o/pub?gid=1101962182&single=true&output=csv"; 
// Au lieu du lien /pub?output=csv, utilisez l'export direct avec l'ID de votre spreadsheet et le gid du sheet :
const SPREADSHEET_ID = "1aDcd_QfGkCBNf2SLhFLbV93-wgbPHxW0psZmI4W3nAA";
const GID = "1101962182"; // Le GID de l'onglet Ventes (souvent 0 pour le premier onglet)
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&gid=${GID}`;

class DataManager {
    static async getVentesJSON() {
        try {
            // 1. Récupération ultra-rapide du CSV (~50ms)
            const cacheBuster = new Date().getTime();
            const fetchUrl = `${CSV_URL}&_nocache=${cacheBuster}`;
            const response = await fetch(fetchUrl, { cache: 'no-store' } );
            if (!response.ok) throw new Error("Erreur lors du chargement des données");
            
            const csvText = await response.text();
            console.log("CSV récupéré :", csvText); 
            // 2. Conversion manuelle du CSV en lignes
            const lines = csvText.trim().split('\n');
            
            const salesArray = [];
            const productsMap = new Map(); // Pour éviter les doublons de produits

            // On saute la première ligne (en-têtes) avec slice(1)
            lines.slice(1).filter(line => line.trim() !== '').forEach((line, index) => {
                // Gestion des séparateurs de colonnes
                const columns = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(col => col.replace(/^"|"$/g, '').trim());
                
                const date = columns[0] || "";
                const caisse = Number(columns[1]) || 0;
                const productName = columns[2] || "";
                const productCategory = columns[3] || "Général";
                const qty = Number(columns[4]) || 0;

                // A. Ajout de la vente dans le tableau
                salesArray.push({
                    "id": `v_${index + 1}`,
                    "date": date,
                    "caisse": caisse,
                    "productName": productName,
                    "productCategory": productCategory,
                    "qty": qty
                });

                // B. Extraction du produit unique (si non vide)
                if (productName !== "" && !productsMap.has(productName)) {
                    productsMap.set(productName, {
                        "id": `p_${productsMap.size + 1}`, // ID unique du produit (ex: "p_1", "p_2")
                        "name": productName,
                        "category": productCategory
                    });
                }
            });

            // Conversion du Map de produits en tableau
            const productsArray = Array.from(productsMap.values());

            // Structure JSON finale
            const finalData = { 
                "products": productsArray,
                "ventes": salesArray 
            };
            
            console.log("Données chargées (JSON) :", finalData);
            return finalData;

        } catch (error) {
            console.error("Erreur :", error);
        }
    }

    static async loadAllData() {
        try {
            console.log("loadAllData Google Sheet");
            await this.getVentesJSON().then(data => {
                if (data && Object.keys(data).length > 0) {
                    products = data.products || [];
                    ventes = data.ventes || [];
                    emptyCategories = data.emptyCategories || [];
                    categoriesOrder = data.categoriesOrder || [];
                } else {
                    // Initialisation si la base est totalement vide
                    products = [
                        { id: 'p_1', name: 'Café', category: 'Boissons Chaudes' },
                        { id: 'p_2', name: 'Thé', category: 'Boissons Chaudes' }
                    ];
                }
            });
        } catch (error) {
            console.error("Erreur d'initialisation des données Google Sheet :", error);
            alert("Erreur de lecture des données Google Sheet : " + error.message);
        }
    }
}
