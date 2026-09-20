    // --- GESTION DU STOCKAGE VIA LOCALSTORAGE ---
    class DataManager {
        static async loadAllData() {
            try {
				console.log("Utilisation de localstorage");
                const data = JSON.parse(localStorage.getItem('state_confiserie'));
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
                    //await this.saveStateToServer(); Ne pas écraser les données de la base si problème de lecture
                }
            } catch (error) {
                console.error("Erreur lors du chargement des données locales :", error);
            }
        }

        // static saveProducts(p) {
        //     localStorage.setItem('clic_saisie_produits', JSON.stringify(p));
        // }
        
        // static saveEmptyCategories(c) {
        //     localStorage.setItem('clic_saisie_categories_vides', JSON.stringify(c));
        // }

        // static saveCategoriesOrder(o) {
        //     localStorage.setItem('clic_saisie_ordre_categories', JSON.stringify(o));
        // }

        // static saveVentes(v) {
        //     localStorage.setItem('clic_saisie_ventes', JSON.stringify(v));
        // }

        static async saveStateToServer() {
            try {
                const state = {
                    products,
                    ventes,
                    emptyCategories,
                    categoriesOrder,
                    updatedAt: Date.now(),
                    mail_address: document.getElementById('mail_address').value
                };
                localStorage.setItem('state_confiserie', JSON.stringify(state));
            } catch (error) {
                console.error("Erreur de sauvegarde synchrone :", error);
                alert("Erreur de sauvegarde synchrone : " + error.message);
            }
        }
    }
