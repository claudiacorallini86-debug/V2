import { Platform, Alert } from 'react-native';
import { TemperatureLog, HaccpChecklist, NonConformity } from '@/hooks/useHaccp';
import { formatDate } from './date';

/**
 * Realizza un export PDF con supporto web e mobile.
 * Web: usa window.print() per stampa/salvataggio
 * Mobile: genera PDF con expo-print e lo condivide
 */

async function generateAndSharePDF(html: string, filename: string) {
  try {
    if (Platform.OS === 'web') {
      // Web: usa window.print() per stampa/salvataggio
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.print();
        }, 500);
      } else {
        Alert.alert('Errore', 'Il browser ha bloccato l\'apertura della finestra di stampa. Controlla le impostazioni dei popup.');
      }
    } else {
      // Mobile: genera PDF con expo-print e condividi
      const Print = await import('expo-print');
      const Sharing = await import('expo-sharing');
      
      const { uri } = await Print.printToFileAsync({
        html: html,
        base64: false,
      });

      // Condividi il PDF
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Condividi ${filename}`,
        UTI: 'com.adobe.pdf', // per iOS
      });
    }
  } catch (error) {
    Alert.alert('Errore', 'Impossibile generare il PDF. Riprova.');
    console.error('PDF generation error:', error);
  }
}
export async function exportHaccpToPDF(data: {
  month: string;
  temperatureLogs: TemperatureLog[];
  checklists: HaccpChecklist[];
  nonConformities: NonConformity[];
  settings?: Record<string, string>;
}) {
  const { month, temperatureLogs, checklists, nonConformities, settings } = data;
  const storeName = settings?.store_name || 'Gelateria Amélie';
  const storeInfo = settings?.store_address ? `${settings.store_address}${settings.store_vat ? ` - P.IVA: ${settings.store_vat}` : ''}` : 'Sistema di Gestione Integrato';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>HACCP ${month}</title>
        <meta charset="utf-8" />
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; line-height: 1.5; }
          h1 { color: #1a1a2e; text-align: center; margin-bottom: 5px; font-size: 28px; }
          h2 { color: #4A90D9; border-bottom: 2px solid #4A90D9; padding-bottom: 5px; margin-top: 40px; font-size: 20px; }
          h3 { font-size: 16px; text-align: center; margin-bottom: 30px; color: #666; font-weight: normal; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; table-layout: fixed; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; word-wrap: break-word; }
          th { background-color: #f8f9fa; font-weight: bold; }
          .out-of-range { color: #ef4444; font-weight: bold; }
          .severity-alta { color: #ef4444; font-weight: bold; }
          .severity-media { color: #f59e0b; font-weight: bold; }
          .severity-bassa { color: #10b981; font-weight: bold; }
          .status-badge { padding: 3px 8px; border-radius: 4px; font-size: 11px; text-transform: uppercase; font-weight: bold; border: 1px solid #ccc; }
          .footer { margin-top: 60px; font-size: 11px; text-align: center; color: #999; border-top: 1px solid #eee; padding-top: 20px; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
            h2 { page-break-before: auto; }
            table { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 20px; text-align: right;">
          <button onclick="window.print()" style="padding: 10px 20px; background: #4A90D9; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
            Stampa / Salva PDF
          </button>
        </div>

        <h1>Registro HACCP</h1>
        <h3>${storeName} - Periodo: ${month}</h3>

        <h2>1. Registro Temperature</h2>
        <table>
          <thead>
            <tr>
              <th style="width: 25%;">Data/Ora</th>
              <th style="width: 25%;">Attrezzatura</th>
              <th style="width: 15%;">Temp. (°C)</th>
              <th style="width: 15%;">Esito</th>
              <th style="width: 20%;">Note</th>
            </tr>
          </thead>
          <tbody>
            ${temperatureLogs.length > 0 ? temperatureLogs.map(log => `
              <tr>
                <td>${formatDate(log.recordedAt, true)}</td>
                <td>${log.equipmentName}</td>
                <td class="${log.outOfRange ? 'out-of-range' : ''}">${log.temperature.toFixed(1)}°C</td>
                <td>${log.outOfRange ? 'NON CONFORME' : 'CONFORME'}</td>
                <td>${log.note || '-'}</td>
              </tr>
            `).join('') : '<tr><td colspan="5" style="text-align: center;">Nessun dato registrato</td></tr>'}
          </tbody>
        </table>

        <h2>2. Checklist Pulizie</h2>
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Frequenza</th>
              <th>Operatore</th>
              <th>Stato</th>
            </tr>
          </thead>
          <tbody>
            ${checklists.length > 0 ? checklists.map(c => `
              <tr>
                <td>${formatDate(c.date)}</td>
                <td>${c.frequency === 'daily' ? 'Giornaliera' : 'Settimanale'}</td>
                <td>${c.operatorName}</td>
                <td>
                  <span class="status-badge">
                    ${c.status === 'complete' ? 'Completa' : c.status === 'partial' ? 'Parziale' : 'Non eseguita'}
                  </span>
                </td>
              </tr>
            `).join('') : '<tr><td colspan="4" style="text-align: center;">Nessun dato registrato</td></tr>'}
          </tbody>
        </table>

        <h2>3. Registro Non Conformità</h2>
        <table>
          <thead>
            <tr>
              <th style="width: 15%;">Data</th>
              <th style="width: 20%;">Categoria</th>
              <th style="width: 35%;">Descrizione</th>
              <th style="width: 15%;">Gravità</th>
              <th style="width: 15%;">Stato</th>
            </tr>
          </thead>
          <tbody>
            ${nonConformities.length > 0 ? nonConformities.map(nc => `
              <tr>
                <td>${formatDate(nc.detectedAt)}</td>
                <td>${nc.category}</td>
                <td>${nc.description}</td>
                <td class="severity-${nc.severity}">${nc.severity.toUpperCase()}</td>
                <td>${nc.status.toUpperCase()}</td>
              </tr>
            `).join('') : '<tr><td colspan="5" style="text-align: center;">Nessuna non conformità registrata</td></tr>'}
          </tbody>
        </table>

        <div class="footer">
          Documento generato automaticamente il ${new Date().toLocaleString('it-IT')}<br />
          ${storeName} - ${storeInfo}
        </div>
      </body>
    </html>
  `;

  await generateAndSharePDF(html, `HACCP_${month.replace(/\//g, '-')}`);
}

export async function exportTraceabilityToPDF(data: {
  title: string;
  type: 'forward' | 'backward';
  items: any[];
  settings?: Record<string, string>;
}) {
  const { title, type, items, settings } = data;
  const storeName = settings?.store_name || 'Gelateria Amélie';
  const storeInfo = settings?.store_address ? `${settings.store_address}${settings.store_vat ? ` - P.IVA: ${settings.store_vat}` : ''}` : 'Sistema di Gestione Integrato';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Tracciabilità ${title}</title>
        <meta charset="utf-8" />
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; line-height: 1.5; }
          h1 { color: #1a1a2e; text-align: center; margin-bottom: 5px; font-size: 28px; }
          h2 { color: #4A90D9; border-bottom: 2px solid #4A90D9; padding-bottom: 5px; margin-top: 40px; font-size: 20px; }
          h3 { font-size: 16px; text-align: center; margin-bottom: 30px; color: #666; font-weight: normal; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; table-layout: fixed; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; word-wrap: break-word; }
          th { background-color: #f8f9fa; font-weight: bold; }
          .footer { margin-top: 60px; font-size: 11px; text-align: center; color: #999; border-top: 1px solid #eee; padding-top: 20px; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 20px; text-align: right;">
          <button onclick="window.print()" style="padding: 10px 20px; background: #4A90D9; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
            Stampa / Salva PDF
          </button>
        </div>

        <h1>Report Tracciabilità</h1>
        <h3>${storeName} - ${title}</h3>

        <h2>${type === 'forward' ? 'Utilizzo in Produzione (Forward)' : 'Origine Ingredienti (Backward)'}</h2>
        <table>
          <thead>
            ${type === 'forward' ? `
              <tr>
                <th>Data Produzione</th>
                <th>Prodotto</th>
                <th>Quantità Utilizzata</th>
                <th>Batch ID</th>
              </tr>
            ` : `
              <tr>
                <th>Ingrediente</th>
                <th>Lotto</th>
                <th>Fornitore</th>
                <th>Quantità</th>
                <th>Scadenza</th>
              </tr>
            `}
          </thead>
          <tbody>
            ${items.length > 0 ? items.map(item => type === 'forward' ? `
              <tr>
                <td>${formatDate(item.producedAt, true)}</td>
                <td>${item.productName}</td>
                <td>${item.quantityUsed} ${item.unit}</td>
                <td>${item.batchId}</td>
              </tr>
            ` : `
              <tr>
                <td>${item.ingredientName}</td>
                <td>${item.lotCode}</td>
                <td>${item.supplier}</td>
                <td>${item.quantityUsed} ${item.unit}</td>
                <td>${formatDate(item.expiryDate)}</td>
              </tr>
            `).join('') : `<tr><td colspan="${type === 'forward' ? 4 : 5}" style="text-align: center;">Nessun dato trovato</td></tr>`}
          </tbody>
        </table>

        <div class="footer">
          Documento generato automaticamente il ${new Date().toLocaleString('it-IT')}<br />
          ${storeName} - ${storeInfo}
        </div>
      </body>
    </html>
  `;

  await generateAndSharePDF(html, `Tracciabilita_${title.replace(/\s+/g, '_')}`);
}

export async function exportStockToPDF(data: {
  date: string;
  ingredients: any[];
  stockMap: Record<string, number>;
  settings?: Record<string, string>;
}) {
  const { date, ingredients, stockMap, settings } = data;
  const storeName = settings?.store_name || 'Gelateria Amélie';
  const storeInfo = settings?.store_address ? `${settings.store_address}${settings.store_vat ? ` - P.IVA: ${settings.store_vat}` : ''}` : 'Sistema di Gestione Integrato';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Giacenze Magazzino ${date}</title>
        <meta charset="utf-8" />
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; line-height: 1.5; }
          h1 { color: #1a1a2e; text-align: center; margin-bottom: 5px; font-size: 28px; }
          h2 { color: #4A90D9; border-bottom: 2px solid #4A90D9; padding-bottom: 5px; margin-top: 40px; font-size: 20px; }
          h3 { font-size: 16px; text-align: center; margin-bottom: 30px; color: #666; font-weight: normal; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background-color: #f8f9fa; font-weight: bold; }
          .low-stock { color: #ef4444; font-weight: bold; }
          .footer { margin-top: 60px; font-size: 11px; text-align: center; color: #999; border-top: 1px solid #eee; padding-top: 20px; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 20px; text-align: right;">
          <button onclick="window.print()" style="padding: 10px 20px; background: #4A90D9; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
            Stampa / Salva PDF
          </button>
        </div>

        <h1>Situazione Magazzino</h1>
        <h3>${storeName} - Data: ${date}</h3>

        <table>
          <thead>
            <tr>
              <th>Ingrediente</th>
              <th>Categoria</th>
              <th>Giacenza Attuale</th>
              <th>Scorta Minima</th>
              <th>Stato</th>
            </tr>
          </thead>
          <tbody>
            ${ingredients.map(i => {
              const stock = stockMap[i.id] || 0;
              const isLow = stock < i.minimumStock;
              return `
                <tr>
                  <td>${i.name}</td>
                  <td>${i.category || '-'}</td>
                  <td class="${isLow ? 'low-stock' : ''}">${stock} ${i.measurementUnit}</td>
                  <td>${i.minimumStock} ${i.measurementUnit}</td>
                  <td>${isLow ? 'SOTTO SCORTA' : 'OK'}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <div class="footer">
          Documento generato automaticamente il ${new Date().toLocaleString('it-IT')}<br />
          ${storeName} - ${storeInfo}
        </div>
      </body>
    </html>
  `;

  await generateAndSharePDF(html, `Magazzino_${date.replace(/\//g, '-')}`);
}

export async function exportProductionListToPDF(data: {
  date: string;
  batches: any[];
  settings?: Record<string, string>;
}) {
  const { date, batches, settings } = data;
  const storeName = settings?.store_name || 'Gelateria Amélie';
  const storeInfo = settings?.store_address ? `${settings.store_address}${settings.store_vat ? ` - P.IVA: ${settings.store_vat}` : ''}` : 'Sistema di Gestione Integrato';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Lista Produzioni ${date}</title>
        <meta charset="utf-8" />
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; line-height: 1.5; }
          h1 { color: #1a1a2e; text-align: center; margin-bottom: 5px; font-size: 28px; }
          h2 { color: #4A90D9; border-bottom: 2px solid #4A90D9; padding-bottom: 5px; margin-top: 40px; font-size: 20px; }
          h3 { font-size: 16px; text-align: center; margin-bottom: 30px; color: #666; font-weight: normal; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background-color: #f8f9fa; font-weight: bold; }
          .footer { margin-top: 60px; font-size: 11px; text-align: center; color: #999; border-top: 1px solid #eee; padding-top: 20px; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 20px; text-align: right;">
          <button onclick="window.print()" style="padding: 10px 20px; background: #4A90D9; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
            Stampa / Salva PDF
          </button>
        </div>

        <h1>Report Produzioni</h1>
        <h3>${storeName} - Report generato il ${date}</h3>

        <table>
          <thead>
            <tr>
              <th>Data/Ora</th>
              <th>Prodotto</th>
              <th>Ricetta</th>
              <th>Quantità</th>
              <th>Costo Tot.</th>
              <th>Operatore</th>
            </tr>
          </thead>
          <tbody>
            ${batches.map(b => `
              <tr>
                <td>${formatDate(b.producedAt, true)}</td>
                <td>${b.productName}</td>
                <td>${b.recipeName}</td>
                <td>${b.quantityProduced} ${b.unitYield}</td>
                <td>€ ${b.frozenBatchCost.toFixed(2)}</td>
                <td>${b.operatorName || 'Sistema'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          Documento generato automaticamente il ${new Date().toLocaleString('it-IT')}<br />
          ${storeName} - ${storeInfo}
        </div>
      </body>
    </html>
  `;

  await generateAndSharePDF(html, `Produzioni_${date.replace(/\//g, '-')}`);
}

export async function exportIngredientsToPDF(data: {
  date: string;
  ingredients: any[];
  stockMap: Record<string, number>;
  settings?: Record<string, string>;
}) {
  const { date, ingredients, stockMap, settings } = data;
  const storeName = settings?.store_name || 'Gelateria Amélie';
  const storeInfo = settings?.store_address ? `${settings.store_address}${settings.store_vat ? ` - P.IVA: ${settings.store_vat}` : ''}` : 'Sistema di Gestione Integrato';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Anagrafica Ingredienti ${date}</title>
        <meta charset="utf-8" />
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; line-height: 1.5; }
          h1 { color: #1a1a2e; text-align: center; margin-bottom: 5px; font-size: 28px; }
          h2 { color: #4A90D9; border-bottom: 2px solid #4A90D9; padding-bottom: 5px; margin-top: 40px; font-size: 20px; }
          h3 { font-size: 16px; text-align: center; margin-bottom: 30px; color: #666; font-weight: normal; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background-color: #f8f9fa; font-weight: bold; }
          .allergens { color: #f59e0b; font-weight: bold; font-size: 10px; }
          .footer { margin-top: 60px; font-size: 11px; text-align: center; color: #999; border-top: 1px solid #eee; padding-top: 20px; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 20px; text-align: right;">
          <button onclick="window.print()" style="padding: 10px 20px; background: #4A90D9; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
            Stampa / Salva PDF
          </button>
        </div>

        <h1>Anagrafica Ingredienti</h1>
        <h3>${storeName} - Report generato il ${date}</h3>

        <table>
          <thead>
            <tr>
              <th>Ingrediente</th>
              <th>Categoria</th>
              <th>Unità</th>
              <th>Conservazione</th>
              <th>Allergeni</th>
              <th>Giacenza</th>
            </tr>
          </thead>
          <tbody>
            ${ingredients.map(i => `
              <tr>
                <td>${i.name}</td>
                <td>${i.category || '-'}</td>
                <td>${i.measurementUnit}</td>
                <td>${i.conservation}</td>
                <td class="allergens">${i.allergens || '-'}</td>
                <td>${stockMap[i.id] || 0} ${i.measurementUnit}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          Documento generato automaticamente il ${new Date().toLocaleString('it-IT')}<br />
          ${storeName} - ${storeInfo}
        </div>
      </body>
    </html>
  `;

  await generateAndSharePDF(html, `Ingredienti_${date.replace(/\//g, '-')}`);
}
