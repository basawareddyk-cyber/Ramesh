/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { extractTariffFromPDF } from './services/tariffService';
import { TariffData, ProcessingStep } from './types';
import { Upload, FileText, Download, Loader2 } from 'lucide-react';

export default function App() {
  const [data, setData] = useState<TariffData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setData(null);

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64Data = (reader.result as string).split(',')[1];
        const extractedData = await extractTariffFromPDF(base64Data, file.type);
        setData(extractedData);
      } catch (err) {
        setError('Failed to extract data. Please try again.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleExportCSV = () => {
    if (!data) return;
    
    const escapeCSV = (val: any) => `"${String(val || '').replace(/"/g, '""')}"`;

    const headers = [
      escapeCSV('S.No'), escapeCSV('Procedure'), escapeCSV('System'), 
      escapeCSV('Inclusions'), escapeCSV('Exclusions'), 
      ...data.room_categories.map(escapeCSV)
    ];

    const rows = data.tariffs.map(t => [
      escapeCSV(t.s_no), escapeCSV(t.procedure), escapeCSV(t.system),
      escapeCSV(t.inclusions), escapeCSV(t.exclusions),
      ...t.rates.map(escapeCSV)
    ]);
    
    const csvContent = "\ufeff" + [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.hospital_name}_Tariff.csv`;
    a.click();
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Hospital Tariff PDF Extractor</h1>
      
      <div className="mb-8 p-6 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-4">
        <Upload className="w-12 h-12 text-gray-400" />
        <input type="file" accept="application/pdf" onChange={handleFileUpload} className="hidden" id="file-upload" />
        <label htmlFor="file-upload" className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          Upload PDF Tariff
        </label>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 text-blue-600">
          <Loader2 className="animate-spin" />
          Processing PDF...
        </div>
      )}

      {error && <div className="text-red-500 mb-4">{error}</div>}

      {data && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">{data.hospital_name}</h2>
            <button onClick={handleExportCSV} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
              <Download size={20} /> Export CSV
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-200">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2">S.No</th>
                  <th className="border p-2">Procedure</th>
                  <th className="border p-2">System</th>
                  {data.room_categories.map(cat => <th key={cat} className="border p-2">{cat}</th>)}
                </tr>
              </thead>
              <tbody>
                {data.tariffs.map((t, i) => (
                  <tr key={i}>
                    <td className="border p-2">{t.s_no}</td>
                    <td className="border p-2">{t.procedure}</td>
                    <td className="border p-2">{t.system}</td>
                    {t.rates.map((rate, j) => <td key={j} className="border p-2">{rate}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
