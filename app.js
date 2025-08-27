const GROUPS = [
    "Efectivo Dorado",
    "Medianet Dorado",
    "Delivery Pedidos Ya",
    "Delivery Uber",
    "Delivery Rappi"
];

const CORRECT_PASSWORD = "2519712"; // Cambia esto por la contraseña que desees

window.onload = function() {
    document.body.style.overflow = 'hidden'; // Evita scroll mientras el modal está activo
};

window.checkPassword = function() {
    const input = document.getElementById('passwordInput').value;
    if (input === CORRECT_PASSWORD) {
        document.getElementById('passwordModal').style.display = 'none';
        document.body.style.overflow = '';
        document.getElementById('mainContent').style.display = 'block'; // Mostrar contenido
    } else {
        document.getElementById('passwordError').style.display = 'block';
    }
};

async function analyzePDFs() {
    const input = document.getElementById('pdfInput');
    const files = Array.from(input.files);
    const groupTotals = {};
    const groupCounts = {};
    const groupFiles = {};

    for (const group of GROUPS) {
        groupTotals[group] = 0;
        groupCounts[group] = 0;
        groupFiles[group] = [];
    }

    for (const file of files) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let text = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            text += content.items.map(item => item.str).join('\n');
        }

        const lines = text.split('\n');
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].trim().toLowerCase() === "total") {
                // Buscar el valor total en las siguientes 5 líneas
                let totalValue = null;
                for (let j = 1; j <= 5; j++) {
                    if (i + j < lines.length) {
                        const line = lines[i + j].trim();
                        if (line === '') continue;
                        let match = line.match(/\$?\s*([\d]+[.,]\d{2})/);
                        if (match) {
                            totalValue = parseFloat(match[1].replace(/,/g, ''));
                            break;
                        }
                    }
                }

                // Buscar el método de pago en las siguientes 8 líneas
                let matchedGroup = null;
                for (let k = 1; k <= 8; k++) {
                    if (i + k < lines.length && lines[i + k].toLowerCase().includes("usando")) {
                        for (const group of GROUPS) {
                            if (lines[i + k].includes(group)) {
                                matchedGroup = group;
                                break;
                            }
                        }
                        if (matchedGroup) break;
                    }
                }

                if (matchedGroup && totalValue && !isNaN(totalValue)) {
                    groupTotals[matchedGroup] += totalValue;
                    groupCounts[matchedGroup] += 1;
                    groupFiles[matchedGroup].push(file.name);
                }
            }
        }
    }

    // Mostrar resultados resumen
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '<h2>Resultados</h2>' + GROUPS.map(
        group => `<p><strong>${group}:</strong> $${groupTotals[group].toFixed(2)} (${groupCounts[group]} TRX${groupCounts[group] !== 1 ? 's' : ''})</p>`
    ).join('');

    // Mostrar detalle por grupo y archivos
    let detailHtml = '<h2>Detalle por grupo</h2>';
    for (const group of GROUPS) {
        if (groupFiles[group].length > 0) {
            detailHtml += `<div class="group-detail"><strong>${group}:</strong><ul>`;
            for (const fileName of groupFiles[group]) {
                detailHtml += `<li>${fileName}</li>`;
            }
            detailHtml += '</ul></div>';
        }
    }
    // Si no hay archivos, mostrar mensaje
    if (detailHtml === '<h2>Detalle por grupo</h2>') {
        detailHtml += '<p>No hay archivos agrupados.</p>';
    }

    // Crear o actualizar el recuadro de detalle
    let detailDiv = document.getElementById('details');
    if (!detailDiv) {
        detailDiv = document.createElement('div');
        detailDiv.id = 'details';
        resultsDiv.parentNode.insertBefore(detailDiv, resultsDiv.nextSibling);
    }
    detailDiv.innerHTML = detailHtml;
}
