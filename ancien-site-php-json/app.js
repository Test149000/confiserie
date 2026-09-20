// Déclaration des variables d'état global
let products = [];
let emptyCategories = []; 
let categoriesOrder = []; 
let ventes = [];
let currentTab = 'ventes';
let derniereDateSaisie = new Date().toISOString().split('T')[0];
let derniereCaisseSaisie = 1;
let categoriesFoldedState = {};
let draggedElement = null;

function switchTab(tabName) {
    currentTab = tabName;
    const tabs = { ventes: document.getElementById('tabVentes'), stats: document.getElementById('tabStats'), produits: document.getElementById('tabProduits') };
    const buttons = { ventes: document.getElementById('btnTabVentes'), stats: document.getElementById('btnTabStats'), produits: document.getElementById('btnTabProduits') };

    Object.keys(tabs).forEach(k => {
        if(tabs[k]) {
            if(k === tabName) tabs[k].classList.remove('hidden');
            else tabs[k].classList.add('hidden');
        }
        if(buttons[k]) {
            if(k === tabName) buttons[k].className = "px-4 py-2 rounded-md bg-white text-blue-600 transition text-xs sm:text-sm font-semibold shadow-sm";
            else buttons[k].className = "px-4 py-2 rounded-md text-white hover:bg-blue-600 transition text-xs sm:text-sm";
        }
    });

    if (tabName === 'stats') {
        updateFilterCategoryOptions();
        updateFilterProductOptions();
    }
    refreshActiveTab();
}

function refreshActiveTab() {
    if (currentTab === 'ventes') renderVentes();
    if (currentTab === 'stats') renderStats();
    if (currentTab === 'produits') renderProduits();
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

function renderVentes() {
    const body = document.getElementById('ventesBody');
    if (!body) return;

    const ventesDateDebut = document.getElementById('ventesDateDebutS').value;
    let dataset = [...ventes].sort((a, b) => new Date(a.date) - new Date(b.date)).filter(v => {
        const matchDebut = ventesDateDebut ? (v.date >= ventesDateDebut) : true;
        return matchDebut;
    });
    let rowsHtml = [];
    let totalQtyAll = 0;

    dataset.forEach(v => {
        totalQtyAll += v.qty;
        rowsHtml.push(`
            <tr class="hover:bg-gray-50">
                <td class="p-1"><input type="date" value="${v.date}" onchange="updateVente('${v.id}', 'date', this.value)" class="w-full p-1.5 border rounded bg-transparent"></td>
                <td class="p-1"><input type="number" min="1" max="9" value="${v.caisse || 1}" onchange="updateVente('${v.id}', 'caisse', this.value)" class="w-full p-1.5 border rounded text-center bg-transparent font-semibold"></td>
                <td class="p-1 text-gray-900 px-3 font-medium align-middle">${v.productName}</td>
                <td class="p-1 text-gray-500 px-3 align-middle">${v.productCategory || "Général"}</td>
                <td class="p-1"><input type="number" min="1" value="${v.qty}" onchange="updateVente('${v.id}', 'qty', this.value)" class="w-full p-1.5 border rounded text-center bg-transparent"></td>
                <td class="p-1 text-center"><button onclick="deleteVente('${v.id}')" class="text-gray-400 hover:text-red-500 p-1"><i class="fas fa-minus-circle"></i></button></td>
            </tr>
        `);
    });

    let sortedProducts = [...products].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    let optionsHtml = sortedProducts.map(p => `<option value="${p.id}">${p.name}</option>`).join('');

    rowsHtml.push(`
        <tr class="bg-green-50/40 border-t-2 border-green-100">
            <td class="p-1"><input type="date" id="newVenteDate" class="w-full p-1.5 border border-dashed border-green-300 rounded bg-white"></td>
            <td class="p-1"><input type="number" min="1" max="9" id="newVenteCaisse" class="w-full p-1.5 border border-dashed border-green-300 rounded bg-white text-center font-bold"></td>
            <td class="p-1">
                <select id="newVentePid" onchange="quickAddVente()" class="w-full p-1.5 border border-dashed border-green-300 rounded bg-white font-semibold">
                    <option value="">+ Vendre un produit...</option>${optionsHtml}
                </select>
            </td>
            <td class="p-1 text-xxs text-gray-400 italic px-3 align-middle">auto</td>
            <td class="p-1"><input type="number" min="1" id="newVenteQty" value="1" class="w-full p-1.5 border border-dashed border-green-300 rounded text-center bg-white font-bold"></td>
            <td class="text-xs text-gray-400 italic pl-4 align-middle">Choisissez un article</td>
        </tr>
    `);
	
	body.innerHTML = rowsHtml.join('');
	
    document.getElementById('newVenteDate').value = derniereDateSaisie;
    document.getElementById('newVenteCaisse').value = derniereCaisseSaisie;
    
    const headerRow = document.getElementById('ventesHeaderRow');
    const footerRow = document.getElementById('ventesFooterRow');
    headerRow.innerHTML = `<th class="p-2 w-36">Date</th><th class="p-2 w-20 text-center">Caisse</th><th class="p-2">Produit</th><th class="p-2 w-40">Catégorie</th><th class="p-2 w-20 text-center">Quantité</th><th class="p-2 w-10"></th>`;
    footerRow.innerHTML = `<td colspan="4" class="p-2 text-right">TOTAL :</td><td class="p-2 text-center text-gray-900 font-bold">${totalQtyAll}</td><td></td>`;
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
function exportProductsToPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');

    // Titre principal du document
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(30, 58, 138); 
    doc.text("CONFISERIE - LISTE DES PRODUITS", 14, 18);

    // Horodatage de génération
    doc.setFontSize(8.5);
    doc.setFont("Helvetica", "normal");
    doc.setTextColor(107, 114, 128);
    doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')} par Geneviève LERIN`, 14, 23);

    // Cartographie et tri des catégories
    const segmentations = {};
    const allCategories = new Set();
    emptyCategories.forEach(c => allCategories.add(c.trim()));
    products.forEach(p => allCategories.add(p.category && p.category.trim() !== "" ? p.category.trim() : "Général"));

    let orderedCategories = categoriesOrder.filter(cat => allCategories.has(cat));
    allCategories.forEach(cat => {
        if (!orderedCategories.includes(cat)) orderedCategories.push(cat);
    });

    orderedCategories.forEach(cat => segmentations[cat] = []);
    products.forEach(p => {
        const name = p.category && p.category.trim() !== "" ? p.category.trim() : "Général";
        segmentations[name].push(p);
    });

    let currentY = 32;

    orderedCategories.forEach(catName => {
        const listProd = segmentations[catName] || [];
        
        if (currentY > 260) { doc.addPage(); currentY = 20; }

        // Intitulé de la section catégorie
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(29, 78, 216); 
        doc.text(`${catName.toUpperCase()}`, 14, currentY);
        currentY += 3;

        if (listProd.length === 0) {
            doc.setFont("Helvetica", "italic");
            doc.setFontSize(9);
            doc.setTextColor(156, 163, 175);
            doc.text("(Cette catégorie ne contient aucun article)", 16, currentY);
            currentY += 10;
            return;
        }

        const colonnes = ["Produits"];
        const lignes = [];

        listProd.forEach(p => {
            lignes.push([p.name]);
        });

        doc.autoTable({
            head: [colonnes],
            body: lignes,
            startY: currentY,
            theme: 'plain',
            headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontSize: 8.5, fontStyle: 'bold' },
            bodyStyles: { fontSize: 8, textColor: [31, 41, 55] },
            styles: { cellPadding: 1 },
            didParseCell: function(data) {
                data.cell.styles.borderBottomWidth = 0.2;
                data.cell.styles.borderBottomColor = [229, 231, 235];
            }
        });

        currentY = doc.lastAutoTable.finalY + 12;
    });

    // Pied de page : pagination centralisée
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(156, 163, 175); 
        doc.text(`Page ${i} sur ${pageCount}`, 105, 289, { align: "center" });
    }

    const fileTimestamp = getFormattedTimestamp();
    doc.save(`confiserie-produits-${fileTimestamp}.pdf`);
}

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
    doc.text("CONFISERIE - RAPPORT DE VENTES", 14, 18);

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
    doc.save(`confiserie-ventes-${fileTimestamp}.pdf`);
}

function renderProduits() {
    const container = document.getElementById('categoriesContainer');
    if (!container) return;
    container.innerHTML = '';

    const allCategories = new Set();
    emptyCategories.forEach(c => allCategories.add(c.trim()));
    products.forEach(p => allCategories.add(p.category && p.category.trim() !== "" ? p.category.trim() : "Général"));

    categoriesOrder = categoriesOrder.filter(cat => allCategories.has(cat));
    allCategories.forEach(cat => { if (!categoriesOrder.includes(cat)) categoriesOrder.push(cat); });

    const categoriesData = {};
    allCategories.forEach(cat => categoriesData[cat] = []);
    products.forEach(p => {
        const name = p.category && p.category.trim() !== "" ? p.category.trim() : "Général";
        categoriesData[name].push(p);
    });

    categoriesOrder.forEach(nomCat => {
        if (!categoriesData[nomCat]) return;
        const suffixe = btoa(unescape(encodeURIComponent(nomCat))).replace(/=/g, '');
        if (categoriesFoldedState[nomCat] === undefined) categoriesFoldedState[nomCat] = false;
        const isFolded = categoriesFoldedState[nomCat];

        const cardBloc = document.createElement('div');
        cardBloc.className = "bg-white rounded-xl shadow-md overflow-hidden border border-gray-200 category-block transition-all duration-150";
        cardBloc.setAttribute('draggable', 'false');
        cardBloc.setAttribute('data-category-name', nomCat);

        cardBloc.addEventListener('dragstart', handleDragStart);
        cardBloc.addEventListener('dragend', handleDragEnd);

        const header = document.createElement('div');
        header.className = `p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center cursor-move select-none accordion-toggle ${isFolded ? 'accordion-closed' : ''}`;
        
        header.addEventListener('mouseenter', () => cardBloc.setAttribute('draggable', 'true'));
        header.addEventListener('mouseleave', () => { if(!draggedElement) cardBloc.setAttribute('draggable', 'false'); });

        let deleteFolderBtn = categoriesData[nomCat].length === 0 ? `<button onclick="deleteEmptyCategory(event, '${nomCat}')" class="ml-2 text-amber-600 text-xxs bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200"><i class="fas fa-folder-minus"></i> Supprimer</button>` : "";

        header.innerHTML = `
            <h3 class="text-xs font-bold uppercase text-gray-900 flex items-center gap-2">
                <span class="text-gray-400 mr-1 text-xxs cursor-move"><i class="fas fa-grip-vertical"></i></span>
                <i class="fas fa-folder text-yellow-500"></i> ${nomCat} 
                <span class="text-xxs lowercase font-normal text-gray-400">(${categoriesData[nomCat].length} article(s))</span> 
                ${deleteFolderBtn}
            </h3>
            <span class="text-gray-400 text-xs"><i class="fas fa-chevron-up"></i></span>
        `;
        
        header.onclick = (e) => {
            if (e.target.closest('button')) return;
            categoriesFoldedState[nomCat] = !categoriesFoldedState[nomCat];
            renderProduits();
        };
        cardBloc.appendChild(header);

        const contentDiv = document.createElement('div');
        contentDiv.className = isFolded ? "hidden" : "p-4";

        if (!isFolded) {
            let lignesHtml = "";
            categoriesData[nomCat].forEach(p => {
                lignesHtml += `
                    <tr class="hover:bg-gray-50">
                        <td class="p-1"><input type="text" value="${p.name}" onchange="updateProduct('${p.id}', 'name', this.value)" class="w-full p-1.5 border rounded bg-transparent focus:bg-white text-xs font-semibold"></td>
                        <!--td class="p-1"><input type="text" value="${p.category || 'Général'}" disabled class="w-full p-1.5 border rounded text-center text-xs bg-gray-100 text-gray-400 cursor-not-allowed select-none"></td-->
                        <td class="p-1 text-center"><button onclick="deleteProduct('${p.id}')" class="text-red-400 hover:text-red-600 p-1"><i class="fas fa-trash-alt text-xs"></i></button></td>
                    </tr>
                `;
            });

            contentDiv.innerHTML = `
                <div class="overflow-x-auto">
                    <table class="min-w-full text-left text-xs">
                        <thead class="bg-gray-100 font-semibold uppercase">
                            <tr>
                                <th class="p-2">Désignation</th>
                                <!--th class="p-2 text-center w-32">Catégorie</th-->
                                <th class="p-2 w-10"></th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100">
                            ${lignesHtml}
                            <tr class="bg-blue-50/40 border-t-2 border-blue-100">
                                <td class="p-1"><input type="text" id="newProdName-${suffixe}" placeholder="+ Ajouter un article..." onchange="quickAddProductFromBloc('${nomCat}', '${suffixe}')" class="w-full p-1.5 border border-dashed border-blue-300 rounded text-xs font-semibold"></td>
                                <!--td class="p-1"><input type="text" id="newProdCat-${suffixe}" value="${nomCat === 'Général' ? '' : nomCat}" class="w-full p-1.5 border border-dashed border-blue-300 rounded text-center text-xs" disabled></td-->
                                <td></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            `;
        }
        cardBloc.appendChild(contentDiv);
        container.appendChild(cardBloc);
    });

    container.addEventListener('dragover', handleDragOver);
}

function handleDragStart(e) {
    draggedElement = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(e) {
    if (draggedElement) {
        draggedElement.classList.remove('dragging');
        draggedElement.setAttribute('draggable', 'false');
    }
    draggedElement = null;

    const orderedBlocks = Array.from(document.querySelectorAll('.category-block'));
    categoriesOrder = orderedBlocks.map(block => block.getAttribute('data-category-name'));
    DataManager.saveStateToServer();
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const container = document.getElementById('categoriesContainer');
    const targetBlock = e.target.closest('.category-block');

    if (targetBlock && targetBlock !== draggedElement) {
        const rect = targetBlock.getBoundingClientRect();
        const nextElement = (e.clientY - rect.top < rect.height / 2) ? targetBlock : targetBlock.nextSibling;
        container.insertBefore(draggedElement, nextElement);
    }
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

function createNewEmptyCategory() {
    const input = document.getElementById('newCategoryNameTop');
    const nomCat = input ? input.value.trim() : "";
    if (!nomCat) return;

    if (nomCat.toLowerCase() === 'général' || products.some(p => (p.category || 'Général').toLowerCase() === nomCat.toLowerCase()) || emptyCategories.some(c => c.toLowerCase() === nomCat.toLowerCase())) {
        alert('Existe déjà.');
        return;
    }
    emptyCategories.push(nomCat);
    categoriesOrder.unshift(nomCat);
    input.value = '';
    renderProduits();
    DataManager.saveStateToServer();
}

function deleteEmptyCategory(e, nomCat) {
    e.stopPropagation();
    emptyCategories = emptyCategories.filter(c => c !== nomCat);
    categoriesOrder = categoriesOrder.filter(c => c !== nomCat);
    renderProduits();
    DataManager.saveStateToServer();
}

function updateProduct(id, champ, value) {
    products = products.map(p => {
        if(p.id === id) {
            if (champ === 'name') p.name = value;
            if (champ === 'category') p.category = value.trim(); 
        }
        return p;
    });
    renderProduits();
    DataManager.saveStateToServer();
}

function updateVente(id, champ, value) {
    ventes = ventes.map(v => {
        if(v.id === id) {
            if (champ === 'date') { v.date = value; derniereDateSaisie = value; }
            if (champ === 'qty') v.qty = parseInt(value) || 1;
            if (champ === 'caisse') { let val = Math.max(1, Math.min(9, parseInt(value) || 1)); v.caisse = val; derniereCaisseSaisie = val; }
        }
        return v;
    });
    renderVentes();
    DataManager.saveStateToServer();
}

function quickAddVente() {
    const pid = document.getElementById('newVentePid').value;
    if(!pid) return;
    const p = products.find(prod => prod.id === pid);

    derniereDateSaisie = document.getElementById('newVenteDate').value;
    derniereCaisseSaisie = Math.max(1, Math.min(9, parseInt(document.getElementById('newVenteCaisse').value) || 1));

    ventes.push({
        id: 'v_' + Date.now(),
        caisse: derniereCaisseSaisie,
        date: derniereDateSaisie,
        productId: pid,
        productName: p ? p.name : "Inconnu",
        productCategory: p ? (p.category || "Général") : "Général", 
        qty: parseInt(document.getElementById('newVenteQty').value) || 1
    });
    renderVentes();
    DataManager.saveStateToServer();
}

function deleteVente(id) {
    ventes = ventes.filter(v => v.id !== id);
    if (ventes.length > 0) {
        const vT = [...ventes].sort((a, b) => new Date(a.date) - new Date(b.date));
        derniereDateSaisie = vT[vT.length - 1].date;
        derniereCaisseSaisie = vT[vT.length - 1].caisse || 1;
    }
    renderVentes();
    DataManager.saveStateToServer();
}

function quickAddProductFromBloc(defaultCategory, suffixe) {
    const name = document.getElementById(`newProdName-${suffixe}`).value.trim();
    if(!name) return;

    products.push({ 
        id: 'p_' + Date.now(), 
        name, 
        category: defaultCategory 
    });
    emptyCategories = emptyCategories.filter(c => c !== defaultCategory);
    renderProduits();
    DataManager.saveStateToServer();
}

function deleteProduct(id) {
    if(confirm("Supprimer ce produit ?")) { 
        products = products.filter(p => p.id !== id); 
        renderProduits(); 
        DataManager.saveStateToServer(); 
    }
}

async function initApp() {
    await DataManager.loadAllData();
    if (ventes.length > 0) {
        const vT = [...ventes].sort((a, b) => new Date(a.date) - new Date(b.date));
        derniereDateSaisie = vT[vT.length - 1].date;
        derniereCaisseSaisie = vT[vT.length - 1].caisse || 1;
    }
    //renderVentes();

    // Détection smartphone
    const w = window.innerWidth;
    const h = window.innerHeight;
    const isMobile = ((w > h && h <= 500) || (w < 768 && h > w));

    if (isMobile) {
        // Active visuellement le bouton et affiche le contenu des stats
        const navButtons = document.getElementById('navButtons');
        if (navButtons) navButtons.classList.add('hidden');
        switchTab('stats');
    } else {
        // Comportement par défaut sur ordinateur
        document.getElementById('ventesDateDebutS').value = getDateNDaysAgo(7);
        switchTab('ventes');
    }   
}

function getDateNDaysAgo(nbDays) {
  const date = new Date();
  date.setDate(date.getDate() - nbDays);
  return date.toISOString().split('T')[0];
}

// Lancement automatique au chargement du script
document.addEventListener('DOMContentLoaded', () => {
    initApp(); 
});
