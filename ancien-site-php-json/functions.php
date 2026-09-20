<?php
header("Content-Type: application/json; charset=UTF-8");

$fichierData = __DIR__ . '/data/confiserie.json';
$fichierLog = __DIR__ . '/data/logs.txt';
$method = $_SERVER['REQUEST_METHOD'];

/**
 * Fonction pour écrire les logs dans un fichier txt
 * @param string $action  Le type d'action (ex: "Appel GET" ou "Appel POST")
 * @param string $entree  Les données reçues en entrée (ou "Aucune")
 * @param string $sortie  La réponse du serveur (Firebase ou message d'erreur)
 */
function ecrireLog($fichier, $action, $entree, $sortie) {
    $date = date('Y-m-d H:i:s');
    
    // Formatage propre du bloc de log
    $texteLog = "=========================================\n";
    $texteLog .= "[$date] $action\n";
    $texteLog .= "-----------------------------------------\n";
    $texteLog .= "DONNÉES ENTRÉE :\n$entree\n";
    $texteLog .= "-----------------------------------------\n";
    $texteLog .= "RETOUR DE L'APPEL :\n$sortie\n";
    $texteLog .= "=========================================\n\n";
    
    // Écrit dans le fichier (FILE_APPEND permet d'ajouter à la suite sans écraser)
    file_put_contents($fichier, $texteLog, FILE_APPEND);
}

// Ne fonctionne pas car l'IP retournée est faussée par un proxy
function getIP()
{
	if(isset($_SERVER['HTTP_X_FORWARDED_FOR']))
		$ip = $_SERVER['HTTP_X_FORWARDED_FOR'];
	elseif(isset($_SERVER['HTTP_CLIENT_IP']))
		$ip = $_SERVER['HTTP_CLIENT_IP'];
	else
		$ip = $_SERVER['REMOTE_ADDR'];
	return $ip;
}

if ($method === 'SEARCH') {
    //ecrireLog($fichierLog, "Appel GET de $ipaddress $ipaddress2", "Aucune (Requête de lecture)", "Rien");
	if (file_exists($fichierData)) {
        echo file_get_contents($fichierData);
    } else {
		echo json_encode(array("Fichier json vide" => "Créer un fichier avec des données."));
    }
    exit;	
}

// ---- 2. CAS DE LA SAUVEGARDE (POST) ----
elseif ($method === 'POST') {
    // Récupération du JSON brut envoyé par JavaScript
    $jsonData = file_get_contents('php://input');

    if (empty($jsonData)) {
        //ecrireLog("Appel POST (ERREUR)", "Aucune donnée reçue", "");
        http_response_code(400);
		echo json_encode(array("error" => "Aucune donnée reçue."));
        exit;
    }
	
	// 2. Contrôle du champ caché (méthode anti-robot)
	$data = json_decode($jsonData, true);
	if (isset($data['mail_address']) && !empty($data['mail_address'])) {
		// C'est un robot ! Il a détecté le champ dans le HTML et l'a rempli.
		http_response_code(403); // Accès interdit
		echo json_encode(array("error" => "Accès refusé."));
        exit;
	}
	
	// On écrit directement le JSON reçu dans le fichier (en écrasant l'ancien)
    if (file_put_contents($fichierData, $jsonData) !== false) {
        echo json_encode(array("success" => true));
    } else {
        http_response_code(500);
        echo json_encode(array("error" => "Impossible d'écrire sur le serveur Free."));
    }	
} 

// ---- 3. METHODE NON AUTORISÉE ----
else {
    http_response_code(405);
    $erreur = json_encode(array("error" => "Méthode non autorisée."));
    //ecrireLog("Appel INCONNU ($method)", "Inconnue", $erreur);
    echo $erreur;
}
?>
