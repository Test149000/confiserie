// Déclaration des variables d'état global
let products = [];
let emptyCategories = []; 
let categoriesOrder = []; 
let ventes = [];

function refreshActiveTab() {
    renderStats();
}

function onCategoryFilterChange() {
    updateFilterProductOptions(); 
    refreshActiveTab();           
}

function getFilteredStatsData(isRegroupeCaisseActive, isRegroupeDatesActive) {
    const filterDateDebut = document.getElementById('filterDateDebutS').value;
    const filterDateFin = document.getElementById('filterDateFinS').value;
    const filterCaisse = document.getElementById('filterCaisseS').value;
    const filterCategory = document.getElementById('filterCategoryS').value;
    const filterProdId = document.getElementById('filterProductS').value;

    const targetFilteredProduct = products.find(p => p.id === filterProdId);
    const targetFilteredName = targetFilteredProduct ? targetFilteredProduct.name.toLowerCase().trim() : null;

    let dataset = ventes.filter(v => {
        const p = products.find(prod => prod.id === v.productId);
        const categoryName = v.productCategory || (p ? p.category : "Général");
        const currentNormName = (v.productName || "").toLowerCase().trim();

        const matchDebut = filterDateDebut ? (v.date >= filterDateDebut) : true;
        const matchFin = filterDateFin ? (v.date <= filterDateFin) : true;
        const matchCaisse = (filterCaisse && filterCaisse !== 'regroupe') ? (String(v.caisse) === String(filterCaisse)) : true;
        const matchCategory = filterCategory ? (categoryName.toLowerCase() === filterCategory.toLowerCase()) : true;
        const matchProd = targetFilteredName ? (currentNormName === targetFilteredName) : true;
        
        return matchDebut && matchFin && matchCaisse && matchCategory && matchProd;
    });

    if (isRegroupeDatesActive) {
        let globalProductGroups = {};
        dataset.forEach(v => {
            const p = products.find(prod => prod.id === v.productId);
            const rawName = v.productName || (p ? p.name : "[Produit Supprimé]");
            const key = rawName.toLowerCase().trim();
            const categoryName = v.productCategory || (p ? p.category : "Général");

            if (!globalProductGroups[key]) {
                globalProductGroups[key] = { productId: v.productId, productName: rawName, productCategory: categoryName, qty: 0 };
            }
            globalProductGroups[key].qty += v.qty;
        });
        dataset = Object.values(globalProductGroups);
        dataset.sort((a, b) => a.productName.localeCompare(b.productName));
        return dataset;
    }

    if (isRegroupeCaisseActive) {
        let groups = {};
        dataset.forEach(v => {
            const p = products.find(prod => prod.id === v.productId);
            const rawName = v.productName || (p ? p.name : "[Produit Supprimé]");
            const key = `${v.date}_${rawName.toLowerCase().trim()}`; 
            const categoryName = v.productCategory || (p ? p.category : "Général");

            if (!groups[key]) {
                groups[key] = { date: v.date, productId: v.productId, productName: rawName, productCategory: categoryName, qty: 0 };
            }
            groups[key].qty += v.qty;
        });
        dataset = Object.values(groups);
    }
    dataset.sort((a, b) => new Date(a.date) - new Date(b.date));
    return dataset;
}

function buildTableHeaderAndFooter(headerId, footerId, isRegroupeCaisse, isRegroupeDates, totalQty, isReadOnly) {
    const headerRow = document.getElementById(headerId);
    const footerRow = document.getElementById(footerId);
    if(!headerRow || !footerRow) return;

    if (isRegroupeDates) {
        headerRow.innerHTML = `<th class="p-2">Produit</th><th class="p-2 w-32 text-center">Quantité</th>`;
        footerRow.innerHTML = `<td class="p-2 text-right">TOTAL :</td><td class="p-2 text-center text-gray-900 font-bold">${totalQty}</td>`;
    } else if (isRegroupeCaisse) {
        headerRow.innerHTML = `<th class="p-2 w-36">Date</th><th class="p-2">Produit</th><th class="p-2 w-24 text-center">Quantité</th>`;
        footerRow.innerHTML = `<td colspan="2" class="p-2 text-right">TOTAL :</td><td class="p-2 text-center text-gray-900 font-bold">${totalQty}</td>`;
    } else {
        headerRow.innerHTML = `<th class="p-2 w-36">Date</th><th class="p-2 w-20 text-center">Caisse</th><th class="p-2">Produit</th><th class="p-2 w-20 text-center">Quantité</th>${!isReadOnly ? '<th class="p-2 w-10"></th>' : ''}`;
        footerRow.innerHTML = `<td colspan="3" class="p-2 text-right">TOTAL :</td><td class="p-2 text-center text-gray-900 font-bold">${totalQty}</td>${!isReadOnly ? '<td></td>' : ''}`;
    }
}

function renderStats() {
    const container = document.getElementById('statsCategoriesContainer');
    const totalBlock = document.getElementById('statsGeneralTotalBlock');
    if (!container) return;

    const isRegroupeCaisse = (document.getElementById('filterCaisseS').value === 'regroupe');
    const isRegroupeDates = document.getElementById('filterRegroupeDatesS').checked;
    
    const filteredDataset = getFilteredStatsData(isRegroupeCaisse, isRegroupeDates);

    if (filteredDataset.length === 0) {
        container.innerHTML = `<div class="bg-white p-8 rounded-xl shadow border text-center text-gray-400 italic">Aucune vente enregistrée sur cette période avec vos critères de recherche.</div>`;
        if(totalBlock) totalBlock.classList.add('hidden');
        return;
    }

    container.innerHTML = '';
    const segmentations = {};
    filteredDataset.forEach(v => {
        const cat = v.productCategory || "Général";
        if (!segmentations[cat]) segmentations[cat] = [];
        segmentations[cat].push(v);
    });

    let activeOrderedCategories = categoriesOrder.filter(cat => segmentations[cat]);
    Object.keys(segmentations).forEach(cat => {
        if (!activeOrderedCategories.includes(cat)) activeOrderedCategories.push(cat);
    });

    let globalQty = 0;

    activeOrderedCategories.forEach(catName => {
        const linesData = segmentations[catName];
        const safeId = btoa(unescape(encodeURIComponent(catName))).replace(/=/g, '');
        
        let currentCatQty = 0;

        const card = document.createElement('div');
        card.className = "bg-white rounded-xl shadow-md overflow-hidden border border-gray-200";
        
        card.innerHTML = `
            <div class="p-3.5 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                <h3 class="text-xs font-bold uppercase text-gray-700 flex items-center gap-2">
                    <i class="fas fa-folder text-yellow-500"></i> ${catName} 
                    <span class="text-xxs font-normal lowercase text-gray-400">(${linesData.length} ligne(s) d'historique)</span>
                </h3>
            </div>
            <div class="p-4">
                <div class="overflow-x-auto">
                    <table class="min-w-full text-left text-xs">
                        <thead class="bg-gray-100 text-gray-600 font-semibold uppercase">
                            <tr id="head-stats-${safeId}"></tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100">
                            ${linesData.map(v => {
                                currentCatQty += v.qty;
                                globalQty += v.qty;

                                if (isRegroupeDates) {
                                    return `<tr class="hover:bg-gray-50/50"><td class="p-2 font-medium text-gray-900">${v.productName}</td><td class="p-2 text-center font-semibold">${v.qty}</td></tr>`;
                                } else if (isRegroupeCaisse) {
                                    return `<tr class="hover:bg-gray-50/50"><td class="p-2 font-mono text-gray-500">${v.date}</td><td class="p-2 font-medium text-gray-900">${v.productName}</td><td class="p-2 text-center font-semibold">${v.qty}</td></tr>`;
                                } else {
                                    return `<tr class="hover:bg-gray-50/50"><td class="p-2 font-mono text-gray-500">${v.date}</td><td class="p-2 text-center font-semibold text-gray-600">Caisse ${v.caisse || 1}</td><td class="p-2 font-medium text-gray-900">${v.productName}</td><td class="p-2 text-center font-semibold">${v.qty}</td></tr>`;
                                }
                            }).join('')}
                        </tbody>
                        <tfoot class="bg-blue-50/60 font-bold text-gray-900 border-t border-blue-100">
                            <tr id="foot-stats-${safeId}"></tr>
                        </footer>
                    </table>
                </div>
            </div>
        `;
        container.appendChild(card);
        buildTableHeaderAndFooter(`head-stats-${safeId}`, `foot-stats-${safeId}`, isRegroupeCaisse, isRegroupeDates, currentCatQty, true);
    });

    if(totalBlock) {
        totalBlock.classList.remove('hidden');
        document.getElementById('globalTotalQty').innerText = `Quantité : ${globalQty}`;
    }
}

function getFormattedTimestamp() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    
    const year = now.getFullYear();
    const month = pad(now.getMonth() + 1);
    const day = pad(now.getDate());
    
    const hours = pad(now.getHours());
    const minutes = pad(now.getMinutes());
    const seconds = pad(now.getSeconds());
    
    return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

// AJOUT : exportProductsToPDF() - Génère la liste exhaustive des produits par catégorie
// function exportProductsToPDF() {
//     const { jsPDF } = window.jspdf;
//     const doc = new jsPDF('p', 'mm', 'a4');

//     // Titre principal du document
//     doc.setFont("Helvetica", "bold");
//     doc.setFontSize(12);
//     doc.setTextColor(30, 58, 138); 
//     doc.text("CONFISERIE - LISTE DES PRODUITS", 14, 18);

//     // Horodatage de génération
//     doc.setFontSize(8.5);
//     doc.setFont("Helvetica", "normal");
//     doc.setTextColor(107, 114, 128);
//     doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')} par Geneviève LERIN`, 14, 23);

//     // Cartographie et tri des catégories
//     const segmentations = {};
//     const allCategories = new Set();
//     emptyCategories.forEach(c => allCategories.add(c.trim()));
//     products.forEach(p => allCategories.add(p.category && p.category.trim() !== "" ? p.category.trim() : "Général"));

//     let orderedCategories = categoriesOrder.filter(cat => allCategories.has(cat));
//     allCategories.forEach(cat => {
//         if (!orderedCategories.includes(cat)) orderedCategories.push(cat);
//     });

//     orderedCategories.forEach(cat => segmentations[cat] = []);
//     products.forEach(p => {
//         const name = p.category && p.category.trim() !== "" ? p.category.trim() : "Général";
//         segmentations[name].push(p);
//     });

//     let currentY = 32;

//     orderedCategories.forEach(catName => {
//         const listProd = segmentations[catName] || [];
        
//         if (currentY > 260) { doc.addPage(); currentY = 20; }

//         // Intitulé de la section catégorie
//         doc.setFont("Helvetica", "bold");
//         doc.setFontSize(11);
//         doc.setTextColor(29, 78, 216); 
//         doc.text(`${catName.toUpperCase()}`, 14, currentY);
//         currentY += 3;

//         if (listProd.length === 0) {
//             doc.setFont("Helvetica", "italic");
//             doc.setFontSize(9);
//             doc.setTextColor(156, 163, 175);
//             doc.text("(Cette catégorie ne contient aucun article)", 16, currentY);
//             currentY += 10;
//             return;
//         }

//         const colonnes = ["Produits"];
//         const lignes = [];

//         listProd.forEach(p => {
//             lignes.push([p.name]);
//         });

//         doc.autoTable({
//             head: [colonnes],
//             body: lignes,
//             startY: currentY,
//             theme: 'plain',
//             headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontSize: 8.5, fontStyle: 'bold' },
//             bodyStyles: { fontSize: 8, textColor: [31, 41, 55] },
//             styles: { cellPadding: 1 },
//             didParseCell: function(data) {
//                 data.cell.styles.borderBottomWidth = 0.2;
//                 data.cell.styles.borderBottomColor = [229, 231, 235];
//             }
//         });

//         currentY = doc.lastAutoTable.finalY + 12;
//     });

//     // Pied de page : pagination centralisée
//     const pageCount = doc.internal.getNumberOfPages();
//     for (let i = 1; i <= pageCount; i++) {
//         doc.setPage(i);
//         doc.setFont("Helvetica", "normal");
//         doc.setFontSize(8);
//         doc.setTextColor(156, 163, 175); 
//         doc.text(`Page ${i} sur ${pageCount}`, 105, 289, { align: "center" });
//     }

//     const fileTimestamp = getFormattedTimestamp();
//     doc.save(`confiserie-produits-${fileTimestamp}.pdf`);
// }

function exportStatsToPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');

    const dateDeb = document.getElementById('filterDateDebutS').value || 'Début';
    const dateFin = document.getElementById('filterDateFinS').value || 'Fin';
    const caisseTxt = document.getElementById('filterCaisseS').options[document.getElementById('filterCaisseS').selectedIndex].text;
    const catTxt = document.getElementById('filterCategoryS').options[document.getElementById('filterCategoryS').selectedIndex].text;
    const prodTxt = document.getElementById('filterProductS').options[document.getElementById('filterProductS').selectedIndex].text;
    
    const isRegroupeCaisse = (document.getElementById('filterCaisseS').value === 'regroupe');
    const isRegroupeDates = document.getElementById('filterRegroupeDatesS').checked;
    
    const dataset = getFilteredStatsData(isRegroupeCaisse, isRegroupeDates);

    if (dataset.length === 0) {
        alert("Aucune donnée disponible à exporter.");
        return;
    }

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(30, 58, 138); 
    doc.text("Au Casse-Croûte Puyfolais - Rapport de ventes", 14, 18);

    doc.setFontSize(8.5);
    doc.setFont("Helvetica", "normal");
    doc.setTextColor(107, 114, 128);
    doc.text(`Émis le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')} par Geneviève LERIN`, 14, 23);

    const cadreGrisHauteur = isRegroupeDates ? 16 : 11;
    doc.setFillColor(243, 244, 246);
    doc.rect(14, 26, 182, cadreGrisHauteur, "F");

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(31, 41, 55);
	if (dateDeb === 'Début' && dateFin === 'Fin')
	{
		doc.text(`Période examinée : Toutes les dates`, 18, 30);
	}
	else if (dateDeb === 'Début' && dateFin !== 'Fin')
	{
		doc.text(`Période examinée : Toutes les dates jusqu'au ${dateFin}`, 18, 30);
	}
	else if (dateDeb !== 'Début' && dateFin === 'Fin')
	{
		doc.text(`Période examinée : Toutes les dates à partir de ${dateDeb}`, 18, 30);
	}
	else
	{
		doc.text(`Période examinée : du ${dateDeb} au ${dateFin}`, 18, 30);
	}
    
    doc.setFont("Helvetica", "normal");
    doc.text(`Critères d'extraction : Caisse [${caisseTxt}] | Dossier [${catTxt}] | Article [${prodTxt}]`, 18, 35);

    if (isRegroupeDates) {
        doc.setFont("Helvetica", "bold");
        doc.setTextColor(29, 78, 216); 
        doc.text("Ventes totales par produit sur la période sélectionnée", 18, 40);
    }

    const segmentations = {};
    dataset.forEach(v => {
        const cat = v.productCategory || "Général";
        if (!segmentations[cat]) segmentations[cat] = [];
        segmentations[cat].push(v);
    });

    let activeOrderedCategories = categoriesOrder.filter(cat => segmentations[cat]);
    Object.keys(segmentations).forEach(cat => {
        if (!activeOrderedCategories.includes(cat)) activeOrderedCategories.push(cat);
    });

    let currentY = isRegroupeDates ? 48 : 44;
    let finalGlobalQty = 0;

    activeOrderedCategories.forEach(catName => {
        const blockVentes = segmentations[catName];
        
        if (currentY > 260) { doc.addPage(); currentY = 20; }

        doc.setFont("Helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(29, 78, 216); 
        doc.text(`${catName.toUpperCase()}`, 14, currentY);
        currentY += 3;

        let colonnes = [];
        let lignes = [];
        let catQty = 0;

        const labelTotalSecteur = `Total ${catName} :`;

        if (isRegroupeDates) {
            colonnes = ["Produit", "Quantité"];
            //colonnes = [{title: "Produit", style:{width:50}}, {title: "Quantité"}];
            blockVentes.forEach(v => {
                catQty += v.qty;
                lignes.push([v.productName, v.qty]);
            });
            lignes.push([{ content: labelTotalSecteur, styles: { halign: 'right', fontStyle: 'bold' } }, { content: String(catQty), styles: { fontStyle: 'bold', halign: 'center' } }]);
        } else if (isRegroupeCaisse) {
            colonnes = ["Date", "Produit", "Quantité"];
            blockVentes.forEach(v => {
                catQty += v.qty;
                lignes.push([v.date, v.productName, v.qty]);
            });
            lignes.push([{ content: labelTotalSecteur, colSpan: 2, styles: { halign: 'right', fontStyle: 'bold' } }, { content: String(catQty), styles: { fontStyle: 'bold', halign: 'center' } }]);
        } else {
            colonnes = ["Date", "Caisse", "Produit", "Quantité"];
            blockVentes.forEach(v => {
                catQty += v.qty;
                lignes.push([v.date, `Caisse ${v.caisse || 1}`, v.productName, v.qty]);
            });
            lignes.push([{ content: labelTotalSecteur, colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } }, { content: String(catQty), styles: { fontStyle: 'bold', halign: 'center' } }]);
        }

        finalGlobalQty += catQty;

        doc.autoTable({
            head: [colonnes],
            body: lignes,
            startY: currentY,
            theme: 'plain',
            headStyles: { fillColor: [75, 85, 99], textColor: [255, 255, 255], fontSize: 8.5, fontStyle: 'bold' },
            bodyStyles: { fontSize: 8, textColor: [31, 41, 55] },
            styles: { cellPadding: 1 },
            columnStyles: {
                [colonnes.length - 1]: { halign: 'center' }
            },
            didParseCell: function(data) {
                data.cell.styles.borderBottomWidth = 0.2;
                data.cell.styles.borderBottomColor = [229, 231, 235];
                if (data.row.index === lignes.length - 1) {
                    data.cell.styles.fillColor = [243, 244, 246];
                    data.cell.styles.textColor = [17, 24, 39];
                }
				if (data.section === 'head') {
					if (colonnes.length === 2) {
						if (data.column.index === 1) {
							data.cell.styles.cellWidth = 20;
							data.cell.styles.halign = 'center';
						}
					}
					else if (colonnes.length === 3) {
						if (data.column.index === 2) {
							data.cell.styles.cellWidth = 20;
							data.cell.styles.halign = 'center';
						}
						else if (data.column.index === 0) {
							data.cell.styles.cellWidth = 30;
						}
					}
					else if (colonnes.length === 4) {
						if (data.column.index === 3) {
							data.cell.styles.cellWidth = 20;
							data.cell.styles.halign = 'center';
						}
						else if (data.column.index === 0) {
							data.cell.styles.cellWidth = 30;
						}
						else if (data.column.index === 1) {
							data.cell.styles.cellWidth = 30;
						}
					}
				}
            }
        });

        currentY = doc.lastAutoTable.finalY + 6;
    });

    //if (currentY > 240) { doc.addPage(); currentY = 20; }
    
    doc.setFillColor(30, 58, 138);
    doc.rect(14, currentY, 182, 10, "F");
    
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text("Total global :", 18, currentY + 6);
    
    doc.text(`Quantité : ${finalGlobalQty}`, 190, currentY + 6, { align: 'right' });

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(156, 163, 175); 
        doc.text(`Page ${i} sur ${pageCount}`, 105, 289, { align: "center" });
    }

    const fileTimestamp = getFormattedTimestamp();
    doc.save(`casse-croûte-puyfolais-ventes-${fileTimestamp}.pdf`);
}

function updateFilterCategoryOptions() {
    const selectCat = document.getElementById('filterCategoryS');
    if (!selectCat) return;
    const currentVal = selectCat.value;
    const uniqueCategories = new Set();
    products.forEach(p => uniqueCategories.add(p.category && p.category.trim() !== "" ? p.category.trim() : "Général"));

    let html = '<option value="">Toutes les catégories</option>';
    Array.from(uniqueCategories).sort().forEach(cat => { html += `<option value="${cat}">${cat}</option>`; });
    selectCat.innerHTML = html;
    selectCat.value = currentVal;
}

function updateFilterProductOptions() {
    const selectProduct = document.getElementById('filterProductS');
    const filterCategoryValue = document.getElementById('filterCategoryS').value;
    if (!selectProduct) return;
    
    const currentVal = selectProduct.value;
    let html = '<option value="">Tous les produits</option>';
    const filteredProducts = products.filter(p => !filterCategoryValue || (p.category || "Général").toLowerCase() === filterCategoryValue.toLowerCase());

    filteredProducts.sort((a, b) => a.name.localeCompare(b.name, 'fr'));

    filteredProducts.forEach(p => { html += `<option value="${p.id}">${p.name}</option>`; });
    selectProduct.innerHTML = html;
    selectProduct.value = products.some(p => p.id === currentVal && filteredProducts.includes(p)) ? currentVal : "";
}

function getLastFirstJune() {
	const now = new Date();
	const year = now.getFullYear();
	// Le mois de juin est l'index 5 (0 = janvier)
	const firstJuneCurrentYear = new Date(year, 5, 1);

	// Si la date actuelle est antérieure au 1er juin de l'année en cours
	const targetYear = (now < firstJuneCurrentYear) ? year - 1 : year;

	// Format ISO direct pour l'input type="date"
	return `${targetYear}-06-01`;
}

async function initApp() {
    await DataManager.loadAllData();
	document.getElementById('filterDateDebutS').value = getLastFirstJune();
    renderStats();
    updateFilterCategoryOptions();
    updateFilterProductOptions();
}

// Lancement automatique au chargement du script
document.addEventListener('DOMContentLoaded', () => {
    initApp(); 
});
