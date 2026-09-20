const PHP_API_URL = "functions.php"; 

class DataManager {
    static async loadAllData() {
        try {
            console.log("Utilisation de la passerelle PHP");
            // Requête GET simple vers le fichier PHP
            const response = await fetch(PHP_API_URL);
            if (!response.ok) throw new Error("Erreur réseau lors de la récupération");
            
            const data = await response.json();
            
            // Si le PHP renvoie une erreur encodée en JSON
            if (data && data.error) throw new Error(data.error);

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
            console.error("Erreur d'initialisation via PHP :", error);
            alert("Erreur de lecture : " + error.message);
        }
    }

    static async saveStateToServer() {
        try {
            const state = {
                products,
                ventes,
                emptyCategories,
                categoriesOrder,
                updatedAt: Date.now()
            };

            // Envoi des données en POST au script PHP
            const response = await fetch(PHP_API_URL, {
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(state)
            });

            if (!response.ok) throw new Error("Impossible de synchroniser avec le serveur PHP");
            
            const result = await response.json();
            if (result && result.error) throw new Error(result.error);
            
        } catch (error) {
            console.error("Erreur de sauvegarde synchrone :", error);
            alert("Erreur de sauvegarde synchrone : " + error.message);
        }
    }
}
