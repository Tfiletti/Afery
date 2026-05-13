import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { Stack } from 'expo-router'; 
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy'; 
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { Asset } from 'expo-asset';
import XLSX from 'xlsx'; 
import { supabase } from '../../src/supabase';
import { useAuth } from '../../src/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

const AZUL_TECH = '#1E3A8A';

export default function HubAdministrativo() {
  const { organizacao_id } = useAuth();
  const [carregando, setCarregando] = useState(false);
  
  const [dataInicio, setDataInicio] = useState(new Date());
  const [dataFim, setDataFim] = useState(new Date());
  const [showInicio, setShowInicio] = useState(false);
  const [showFim, setShowFim] = useState(false);
  const [supervisorAtivo, setSupervisorAtivo] = useState('Todos');
  const [supervisores, setSupervisores] = useState<string[]>([]);

  useEffect(() => {
    const carregarSupervisores = async () => {
      if (!organizacao_id) return;
      const { data } = await supabase.from('itens').select('responsavel').eq('organizacao_id', organizacao_id);
      if (data) {
        const unicos = Array.from(new Set(data.map(i => i.responsavel).filter(Boolean))) as string[];
        setSupervisores(unicos.sort());
      }
    };
    carregarSupervisores();
  }, [organizacao_id]);

  const obterNomeArquivo = (prefixo: string, extensao: string) => {
    const dIni = `${dataInicio.getDate()}-${dataInicio.getMonth() + 1}`;
    const dFim = `${dataFim.getDate()}-${dataFim.getMonth() + 1}`;
    return `${prefixo}_${dIni}_A_${dFim}.${extensao}`;
  };

  const gerarDatasNoPeriodo = (inicio: Date, fim: Date) => {
    const datas = [];
    let atual = new Date(inicio);
    while (atual <= fim) {
      datas.push(new Date(atual));
      atual.setDate(atual.getDate() + 1);
    }
    return datas;
  };

  const buscarDadosProcessados = async () => {
    let query = supabase.from('itens').select('*').eq('organizacao_id', organizacao_id);
    if (supervisorAtivo !== 'Todos') query = query.eq('responsavel', supervisorAtivo);
    const { data: itens } = await query.order('sku_codigo');
    const { data: estoque } = await supabase.from('estoque_sistema').select('*').eq('organizacao_id', organizacao_id);
    const { data: contagens } = await supabase.from('contagens').select('*').eq('organizacao_id', organizacao_id);
    const mapaSistema = new Map(estoque?.map(e => [e.sku_codigo, e.saldo_sistema || 0]));
    return (itens || []).map(i => ({
      ...i,
      sistema: mapaSistema.get(i.sku_codigo) || 0,
      contagensRaw: contagens?.filter(c => c.item_id === i.id) || []
    }));
  };

  const exportarPDFMaster = async () => {
    setCarregando(true);
    try {
      const logoAsset = Asset.fromModule(require('../../assets/images/icon.png'));
      await logoAsset.downloadAsync();
      const base64Logo = await FileSystem.readAsStringAsync(logoAsset.localUri!, { encoding: 'base64' });
      const logoUri = `data:image/png;base64,${base64Logo}`;
      const itensBase = await buscarDadosProcessados();
      const datasPeriodo = gerarDatasNoPeriodo(dataInicio, dataFim);
      
      let htmlPaginas = "";
      datasPeriodo.forEach((data) => {
        const dataStr = data.toLocaleDateString('pt-BR');
        const inicioT = new Date(data); inicioT.setHours(5,0,0,0);
        const fimT = new Date(inicioT); fimT.setDate(fimT.getDate() + 1);
        
        const linhasTabela = itensBase.map(item => {
          const fis = item.contagensRaw.filter(c => new Date(c.data_hora) >= inicioT && new Date(c.data_hora) < fimT).reduce((acc, curr) => acc + (curr.peso_liquido_calculado || 0), 0);
          const desv = fis - item.sistema;
          const imp = desv * (item.preco_unitario || 0);

          return `
            <tr>
              <td style="border-bottom: 1px solid #eee; padding: 12px 8px;"><b>${item.sku_codigo}</b></td>
              <td style="border-bottom: 1px solid #eee; padding: 12px 8px;">${item.descricao}</td>
              <td style="border-bottom: 1px solid #eee; padding: 12px 8px; text-align:right">${fis.toFixed(1)}</td>
              <td style="border-bottom: 1px solid #eee; padding: 12px 8px; text-align:right">${item.sistema.toFixed(1)}</td>
              <td style="border-bottom: 1px solid #eee; padding: 12px 8px; text-align:right; font-weight:bold; color:${desv < 0 ? '#ef4444' : '#1e293b'}">${desv.toFixed(1)}</td>
              <td style="border-bottom: 1px solid #eee; padding: 12px 8px; text-align:right; font-weight:bold; color:${imp < 0 ? '#ef4444' : '#059669'}">R$ ${imp.toFixed(2)}</td>
            </tr>
          `;
        }).join('');

        htmlPaginas += `<div style="page-break-after: always; padding: 40px; font-family: Helvetica, Arial, sans-serif;"><div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 4px solid ${AZUL_TECH}; padding-bottom:15px; margin-bottom: 25px;"><img src="${logoUri}" style="width:65px; height:65px; border-radius:12px;" /><div style="text-align:right"><h1 style="margin:0; color:${AZUL_TECH}; font-size: 24px;">Relatório de Auditoria</h1><p style="margin:5px 0 0; font-size:14px; color:#64748b;"><b>Data:</b> ${dataStr} | <b>Supervisor:</b> ${supervisorAtivo}</p></div></div><table style="width:100%; border-collapse:collapse;"><thead><tr style="background:${AZUL_TECH};"><th style="padding:15px 10px; text-align:left; color:white; font-size:12px;">SKU</th><th style="padding:15px 10px; text-align:left; color:white; font-size:12px;">DESCRIÇÃO</th><th style="padding:15px 10px; text-align:right; color:white; font-size:12px;">FÍSICO</th><th style="padding:15px 10px; text-align:right; color:white; font-size:12px;">SISTEMA</th><th style="padding:15px 10px; text-align:right; color:white; font-size:12px;">DESVIO</th><th style="padding:15px 10px; text-align:right; color:white; font-size:12px;">IMPACTO</th></tr></thead><tbody style="color:#334155; font-size:12px;">${linhasTabela}</tbody></table></div>`;
      });

      const { uri } = await Print.printToFileAsync({ html: `<html><body style="margin:0; padding:0;">${htmlPaginas}</body></html>` });
      const nomeArquivo = obterNomeArquivo("AFERY_RELATORIO", "pdf");
      const novaUri = `${FileSystem.cacheDirectory}${nomeArquivo}`;
      await FileSystem.moveAsync({ from: uri, to: novaUri });
      await Sharing.shareAsync(novaUri);
    } catch (e: any) { Alert.alert("Erro no PDF", e.message); }
    finally { setCarregando(false); }
  };

  const exportarExcelAuditoria = async () => {
    setCarregando(true);
    try {
      const datasPeriodo = gerarDatasNoPeriodo(dataInicio, dataFim);
      const itensBase = await buscarDadosProcessados();
      const headerSup = ["AFERY MASTER", "", ""]; 
      const headerInf = ["SKU", "DESCRIÇÃO", "RESPONSÁVEL"]; 
      const merges = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }]; 
      const colWidths = [{ wch: 15 }, { wch: 45 }, { wch: 20 }];

      datasPeriodo.forEach((d, i) => {
        const dataStr = d.toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'});
        headerSup.push(dataStr, "", "", "");
        headerInf.push("Físico", "Sistema", "Desvio", "Impacto R$");
        const colStart = 3 + (i * 4);
        merges.push({ s: { r: 0, c: colStart }, e: { r: 0, c: colStart + 3 } });
        colWidths.push({ wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 18 });
      });

      const rows = [headerSup, headerInf];
      itensBase.forEach(item => {
        const row: any[] = [item.sku_codigo, item.descricao, item.responsavel];
        datasPeriodo.forEach(data => {
          const inicioT = new Date(data); inicioT.setHours(5,0,0,0);
          const fimT = new Date(inicioT); fimT.setDate(fimT.getDate() + 1);
          const fis = item.contagensRaw.filter(c => new Date(c.data_hora) >= inicioT && new Date(c.data_hora) < fimT).reduce((acc, curr) => acc + (curr.peso_liquido_calculado || 0), 0);
          const desv = fis - item.sistema;
          const imp = desv * (item.preco_unitario || 0);
          row.push({v: fis, t:'n', z:'#,##0.0'}, {v: item.sistema, t:'n', z:'#,##0.0'}, {v: desv, t:'n', z:'#,##0.0'}, {v: imp, t:'n', z:'"R$ "#,##0.00;-"R$ "#,##0.00'});
        });
        rows.push(row);
      });

      const ws = XLSX.utils.aoa_to_sheet(rows);
      
      ws['!views'] = [{ state: 'frozen', xSplit: 3, ySplit: 2 }];
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
      ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 1, c: 0 }, e: { r: range.e.r, c: range.e.c } }) };

      ws['!merges'] = merges;
      ws['!cols'] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "AFERY MASTER");
      const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const uri = `${FileSystem.cacheDirectory}${obterNomeArquivo("AFERY_AUDITORIA", "xlsx")}`;
      await FileSystem.writeAsStringAsync(uri, wbout, { encoding: 'base64' });
      await Sharing.shareAsync(uri);
    } catch (e: any) { Alert.alert("Erro", e.message); }
    finally { setCarregando(false); }
  };

  const parseNum = (val: any) => {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    let s = String(val).replace(/\./g, '').replace(',', '.');
    return parseFloat(s) || 0;
  };

  // --- AJUSTE CIRÚRGICO: ABA SALDO_SISTEMA COM DESCRIÇÃO ---
  const baixarTemplateGestao = async () => {
    try {
      const { data: itens } = await supabase.from('itens').select('*, familias(nome)').eq('organizacao_id', organizacao_id);
      
      const hoje = new Date();
      const dataExcelSerial = 25569.0 + ((hoje.getTime() - (hoje.getTimezoneOffset() * 60000)) / (86400 * 1000));

      const rowsGestao = [["SKU", "DESCRIÇÃO", "FAMÍLIA", "LOCAL", "UNIDADE", "RESPONSÁVEL", "PREÇO_UNIT"]];
      
      itens?.forEach(i => {
        rowsGestao.push([
          String(i.sku_codigo), 
          i.descricao, 
          i.familias?.nome || "", 
          i.localizacao || "", 
          i.unidade_medida || "KG", 
          i.responsavel || "", 
          i.preco_unitario || 0
        ]);
      });

      // AJUSTE: Adição da coluna DESCRIÇÃO
      const rowsSaldo = [["DATA", "SKU", "DESCRIÇÃO", "VALOR_SISTEMA", "RESPONSÁVEL"]];
      itens?.forEach(i => {
        rowsSaldo.push([
          { v: dataExcelSerial, t: 'n', z: 'dd/mm/yyyy' }, 
          String(i.sku_codigo), 
          i.descricao || "", // Adicionando a descrição dinâmica
          "", 
          i.responsavel || "" 
        ]);
      });

      const wb = XLSX.utils.book_new();
      
      const wsGestao = XLSX.utils.aoa_to_sheet(rowsGestao);
      
      const rangeGestao = XLSX.utils.decode_range(wsGestao['!ref'] || 'A1:A1');
      for (let R = 1; R <= rangeGestao.e.r; ++R) { 
        const cellAddress = XLSX.utils.encode_cell({c: 0, r: R}); 
        if (!wsGestao[cellAddress]) continue;
        wsGestao[cellAddress].t = 's'; 
        wsGestao[cellAddress].z = '@'; 
      }
      wsGestao['!cols'] = [{ wch: 15 }, { wch: 40 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 20 }, { wch: 15 }];
      
      const wsSaldo = XLSX.utils.aoa_to_sheet(rowsSaldo);
      
      const rangeSaldo = XLSX.utils.decode_range(wsSaldo['!ref'] || 'A1:A1');
      for (let R = 1; R <= rangeSaldo.e.r; ++R) { 
        const cellAddress = XLSX.utils.encode_cell({c: 1, r: R}); 
        if (!wsSaldo[cellAddress]) continue;
        wsSaldo[cellAddress].t = 's'; 
        wsSaldo[cellAddress].z = '@'; 
      }
      // AJUSTE: Largura da nova coluna Descrição (wch: 45) no índice 2
      wsSaldo['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 45 }, { wch: 20 }, { wch: 20 }];

      XLSX.utils.book_append_sheet(wb, wsGestao, "GESTAO_MASTER");
      XLSX.utils.book_append_sheet(wb, wsSaldo, "SALDO_SISTEMA");
      
      const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const uri = `${FileSystem.cacheDirectory}AFERY_PLANILHA_MESTRE.xlsx`;
      await FileSystem.writeAsStringAsync(uri, wbout, { encoding: 'base64' });
      await Sharing.shareAsync(uri);
    } catch (e) { Alert.alert("Erro", "Falha ao gerar planilha mestre."); }
  };

  const importarGestaoBase = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      if (res.canceled) return;
      setCarregando(true);

      const conteudo = await FileSystem.readAsStringAsync(res.assets[0].uri, { encoding: 'base64' });
      const wb = XLSX.read(conteudo, { type: 'base64' });

      const sheetGestao = wb.Sheets["GESTAO_MASTER"];
      if (sheetGestao) {
        const dadosGestao = XLSX.utils.sheet_to_json(sheetGestao) as any[];
        
        const nomesAreas = Array.from(new Set(dadosGestao.map(d => String(d.LOCAL || '').trim()).filter(Boolean)));
        if (nomesAreas.length > 0) await supabase.from('areas').upsert(nomesAreas.map(nome => ({ nome, organizacao_id, ativo: true })), { onConflict: 'nome' });

        const nomesFamilias = Array.from(new Set(dadosGestao.map(d => String(d.FAMÍLIA || '').trim()).filter(Boolean)));
        if (nomesFamilias.length > 0) await supabase.from('familias').upsert(nomesFamilias.map(nome => ({ nome, organizacao_id, ativo: true })), { onConflict: 'nome' });

        const { data: famsDB } = await supabase.from('familias').select('id, nome').eq('organizacao_id', organizacao_id);
        const mapaFamilias = new Map(famsDB?.map(f => [f.nome, f.id]));

        const itensUpsert = dadosGestao.map(d => {
          return {
            sku_codigo: String(d.SKU).trim(),
            descricao: d.DESCRIÇÃO,
            familia_id: mapaFamilias.get(String(d.FAMÍLIA || '').trim()), 
            localizacao: String(d.LOCAL || '').trim(), 
            unidade_medida: d.UNIDADE || 'KG',
            responsavel: d.RESPONSÁVEL,
            preco_unitario: parseNum(d.PREÇO_UNIT),
            organizacao_id,
            ativo: true
          };
        });
        await supabase.from('itens').upsert(itensUpsert, { onConflict: 'sku_codigo' });
      }

      const sheetSaldo = wb.Sheets["SALDO_SISTEMA"];
      if (sheetSaldo) {
        const dadosSaldo = XLSX.utils.sheet_to_json(sheetSaldo) as any[];
        const mapaAgrupado = new Map();

        dadosSaldo
          .filter(d => d.SKU && d.VALOR_SISTEMA !== undefined && d.VALOR_SISTEMA !== "")
          .forEach(d => {
            let dataRef = new Date().toISOString().split('T')[0];
            if (d.DATA) {
               dataRef = typeof d.DATA === 'number' 
                 ? new Date((d.DATA - 25569) * 86400 * 1000).toISOString().split('T')[0]
                 : String(d.DATA).split(' ')[0];
            }

            const sku = String(d.SKU).trim();
            const chaveUnica = `${sku}_${dataRef}`; 
            const valorAtual = parseNum(d.VALOR_SISTEMA);

            if (mapaAgrupado.has(chaveUnica)) {
              mapaAgrupado.get(chaveUnica).saldo_sistema += valorAtual;
            } else {
              mapaAgrupado.set(chaveUnica, {
                sku_codigo: sku,
                saldo_sistema: valorAtual,
                data_atualizacao: new Date().toISOString(),
                data_referencia: dataRef,
                organizacao_id
              });
            }
          });

        const estoqueUpsert = Array.from(mapaAgrupado.values());

        if (estoqueUpsert.length > 0) {
          const { error } = await supabase
            .from('estoque_sistema')
            .upsert(estoqueUpsert, { onConflict: 'sku_codigo, organizacao_id, data_referencia' });
          if (error) throw error;
        }
      }

      Alert.alert("Sucesso", "Base e históricos sincronizados!");
    } catch (e: any) { Alert.alert("Erro", e.message); }
    finally { setCarregando(false); }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Gestão massiva de cadastros e Relatórios", headerTitleStyle: { fontSize: 13, fontWeight: '800' }, headerStyle: { backgroundColor: AZUL_TECH }, headerTintColor: '#FFF' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Relatórios de Auditoria</Text>
          <View style={styles.rowDates}><TouchableOpacity style={styles.dateBox} onPress={() => setShowInicio(true)}><Text style={styles.dateLabel}>DE</Text><Text style={styles.dateValue}>{dataInicio.toLocaleDateString()}</Text></TouchableOpacity><TouchableOpacity style={styles.dateBox} onPress={() => setShowFim(true)}><Text style={styles.dateLabel}>ATÉ</Text><Text style={styles.dateValue}>{dataFim.toLocaleDateString()}</Text></TouchableOpacity></View>
          <Text style={styles.filterLabel}>Supervisor:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 15}}>{['Todos', ...supervisores].map(s => (<TouchableOpacity key={s} onPress={() => setSupervisorAtivo(s)} style={[styles.supBtn, supervisorAtivo === s && styles.supBtnAtivo]}><Text style={[styles.supTxt, supervisorAtivo === s && {color:'#FFF'}]}>{s}</Text></TouchableOpacity>))}</ScrollView>
          <TouchableOpacity style={styles.btnPdf} onPress={exportarPDFMaster}><Ionicons name="document-text" size={20} color="#FFF" /><Text style={styles.btnTextPdf}>GERAR RELATÓRIO PDF</Text></TouchableOpacity>
          <TouchableOpacity style={styles.btnExcel} onPress={exportarExcelAuditoria}><Ionicons name="grid-outline" size={20} color={AZUL_TECH} /><Text style={styles.btnTextExcel}>BAIXAR EXCEL AUDITORIA</Text></TouchableOpacity>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gestão de Base & Dados</Text>
          <Text style={styles.desc}>Sincronize Itens e Saldos Diários usando as abas da mesma planilha.</Text>
          <TouchableOpacity style={styles.btnSecondary} onPress={baixarTemplateGestao}><Ionicons name="download-outline" size={20} color={AZUL_TECH} /><Text style={styles.btnTextSecondary}>BAIXAR PLANILHA MESTRE</Text></TouchableOpacity>
          <TouchableOpacity style={styles.btnPrimary} onPress={importarGestaoBase}>{carregando ? <ActivityIndicator color="#FFF" /> : <><Ionicons name="sync-circle" size={22} color="#FFF" /><Text style={styles.btnText}>SINCRONIZAR BASE</Text></>}</TouchableOpacity>
        </View>
        {showInicio && <DateTimePicker value={dataInicio} mode="date" onChange={(e, d) => { setShowInicio(false); if(d) setDataInicio(d); }} />}
        {showFim && <DateTimePicker value={dataFim} mode="date" onChange={(e, d) => { setShowFim(false); if(d) setDataFim(d); }} />}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  content: { padding: 15, paddingTop: 10 },
  section: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginBottom: 15, elevation: 3 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: AZUL_TECH, marginBottom: 15 },
  rowDates: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  dateBox: { flex: 1, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' },
  dateLabel: { fontSize: 9, fontWeight: 'bold', color: '#94A3B8' },
  dateValue: { fontSize: 14, fontWeight: 'bold', color: AZUL_TECH },
  filterLabel: { fontSize: 11, fontWeight: 'bold', color: '#64748B', marginBottom: 8 },
  supBtn: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F1F5F9', marginRight: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  supBtnAtivo: { backgroundColor: AZUL_TECH, borderColor: AZUL_TECH },
  supTxt: { fontSize: 11, color: '#64748B', fontWeight: 'bold' },
  btnPdf: { backgroundColor: AZUL_TECH, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16, borderRadius: 14, marginBottom: 10 },
  btnExcel: { borderWidth: 2, borderColor: AZUL_TECH, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16, borderRadius: 14 },
  btnTextPdf: { color: '#FFF', fontWeight: 'bold' },
  btnTextExcel: { color: AZUL_TECH, fontWeight: 'bold' },
  desc: { fontSize: 12, color: '#64748B', marginBottom: 15 },
  btnPrimary: { backgroundColor: AZUL_TECH, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16, borderRadius: 14 },
  btnSecondary: { borderWidth: 2, borderColor: AZUL_TECH, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16, borderRadius: 14, marginBottom: 10 },
  btnText: { color: '#FFF', fontWeight: 'bold' },
  btnTextSecondary: { color: AZUL_TECH, fontWeight: 'bold' },
  guideSection: { paddingHorizontal: 10, marginTop: 5, marginBottom: 30 },
  guideTitle: { fontSize: 14, fontWeight: '900', color: '#475569', marginBottom: 12 },
  guideItem: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  guideText: { fontSize: 12, color: '#64748B', flex: 1, lineHeight: 18 }
});