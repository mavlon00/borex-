import { useMemo, useState } from 'react';
import { Plus, Zap, BatteryCharging, Sun, Gauge, Trash2, Save, ChevronDown, ShieldCheck } from 'lucide-react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { postEstimates } from '../endpoints/estimates_POST.schema';
import styles from './_index.module.css';
import borexLogo from '../borex-Asset1.png';

type Load = { id: number; name: string; watts: number; qty: number; hours: number; period: 'Day' | 'Night' | 'Both'; critical: boolean; surge: number };

const presets = [
  ['AC 1 HP', 900, 2.5], ['AC 1.5 HP', 1300, 2.5], ['AC 2 HP', 1800, 2.5], ['Refrigerator', 180, 3], ['Freezer', 250, 3], ['TV', 120, 1], ['Ceiling Fan', 75, 1], ['Standing Fan', 80, 1], ['LED Light', 12, 1], ['Water Pump', 750, 3], ['Decoder', 20, 1], ['Laptop', 65, 1]
] as const;

const sample: Load[] = [
  { id: 1, name: 'AC 1.5 HP', watts: 1300, qty: 1, hours: 5, period: 'Night', critical: false, surge: 2.5 },
  { id: 2, name: 'Refrigerator', watts: 180, qty: 1, hours: 24, period: 'Both', critical: true, surge: 3 },
  { id: 3, name: 'LED Light', watts: 12, qty: 8, hours: 6, period: 'Night', critical: true, surge: 1 },
  { id: 4, name: 'TV', watts: 120, qty: 1, hours: 5, period: 'Night', critical: false, surge: 1 },
  { id: 5, name: 'Water Pump', watts: 750, qty: 1, hours: 1, period: 'Day', critical: false, surge: 2.5 }
];

function App() {
  const [loads, setLoads] = useState<Load[]>(sample);
  const [client, setClient] = useState('Demo Residence');
  const [sunHours, setSunHours] = useState('5.0');
  const [backup, setBackup] = useState('12');
  const [systemVoltage, setSystemVoltage] = useState('48');
  const [showPresets, setShowPresets] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  const totals = useMemo(() => {
    const connected = loads.reduce((s, l) => s + l.watts * l.qty, 0);
    const daily = loads.reduce((s, l) => s + (l.watts * l.qty * l.hours) / 1000, 0);
    const critical = loads.filter(l => l.critical).reduce((s, l) => s + l.watts * l.qty * l.surge, 0);
    const occasional = loads.filter(l => !l.critical).reduce((s, l) => s + l.watts * l.qty * l.surge, 0);
    const peak = critical + occasional * 0.6;
    const inverter = Math.ceil((peak * 1.25) / 500) * 500;
    const nightEnergy = loads.reduce((s, l) => s + (l.period === 'Day' ? 0 : (l.watts * l.qty * l.hours) / 1000), 0);
    const battery = (nightEnergy * Math.min(Number(backup) / 12, 1.5)) / 0.8;
    const array = (daily * 1.25) / Math.max(Number(sunHours), 1);
    const panelCount = Math.ceil((array * 1000) / 550);
    return { connected, daily, peak, inverter, battery, array, panelCount, nightEnergy };
  }, [loads, backup, sunHours]);

  const saveEstimate = async () => {
    setSaving(true);
    setSavedId(null);
    try {
      const result = await postEstimates({
        clientName: client,
        backupHours: Number(backup),
        systemVoltage: Number(systemVoltage),
        sunHours: Number(sunHours),
        totalConnectedW: totals.connected,
        dailyEnergyKwh: totals.daily,
        peakSurgeW: totals.peak,
        recommendedInverterKva: totals.inverter / 1000,
        recommendedBatteryKwh: totals.battery,
        recommendedBatteryAh: (totals.battery * 1000) / Number(systemVoltage),
        recommendedSolarKwp: totals.array,
        panelCount: totals.panelCount,
        safetyMargin: 0.25,
        overrides: [],
        loads: loads.map(l => ({
          applianceName: l.name,
          quantity: l.qty,
          watts: l.watts,
          hoursPerDay: l.hours,
          usagePeriod: l.period,
          critical: l.critical,
          surgeMultiplier: l.surge
        }))
      });
      setSavedId(result.id);
    } finally {
      setSaving(false);
    }
  };

  const addPreset = (name: string, watts: number, surge: number) => {
    setLoads(prev => [...prev, { id: Date.now(), name, watts, qty: 1, hours: 4, period: 'Day', critical: false, surge }]);
    setShowPresets(false);
  };

  const update = (id: number, patch: Partial<Load>) => setLoads(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l));

  return <main className={styles.shell}>
    <header className={styles.header}>
      <div className={styles.brand}><img src={borexLogo} alt="BoreX" className={styles.brandLogo} /></div>
      <div className={styles.client}><span>CLIENT</span><Input value={client} onChange={e => setClient(e.target.value)} /></div>
      <Button onClick={saveEstimate} disabled={saving}><Save size={16}/> {saving ? 'Saving…' : 'Save estimate'}</Button>
    </header>

    <section className={styles.metrics}>
      <Metric icon={<Zap/>} label="CONNECTED LOAD" value={`${totals.connected.toLocaleString()} W`} />
      <Metric icon={<Gauge/>} label="PEAK / SURGE" value={`${Math.round(totals.peak).toLocaleString()} W`} note="includes motor starting demand" />
      <Metric icon={<BatteryCharging/>} label="DAILY ENERGY" value={`${totals.daily.toFixed(2)} kWh`} />
      <Metric icon={<Sun/>} label="RECOMMENDED INVERTER" value={`${(totals.inverter / 1000).toFixed(1)} kVA`} accent />
    </section>

    <div className={styles.grid}>
      <section className={styles.panel}>
        <div className={styles.panelHead}><div><div className={styles.sectionTag}>01 / LOADS</div><h2>Appliance inventory</h2></div><div className={styles.actions}><Button variant="outline" onClick={() => setShowPresets(v => !v)}><Plus size={16}/> Add appliance <ChevronDown size={14}/></Button></div></div>
        {showPresets && <div className={styles.presets}>{presets.map(([name, watts, surge]) => <button key={name} onClick={() => addPreset(name, watts, surge)}><span>{name}</span><b>{watts} W</b></button>)}<div className={styles.custom}><Input placeholder="Custom appliance" id="custom-name"/><Input placeholder="Watts" id="custom-watts"/><Button onClick={() => { const n = (document.getElementById('custom-name') as HTMLInputElement)?.value; const w = Number((document.getElementById('custom-watts') as HTMLInputElement)?.value); if(n && w) addPreset(n, w, 1); }}>Add custom</Button></div></div>}
        <div className={styles.tableHead}><span>APPLIANCE</span><span>QTY</span><span>WATTS</span><span>HOURS / DAY</span><span>WHEN</span><span>PRIORITY</span><span></span></div>
        {loads.map(load => <div className={styles.row} key={load.id}>
          <div className={styles.appliance}><span className={styles.loadIcon}><Zap size={14}/></span><div><b>{load.name}</b><small>Surge ×{load.surge}</small></div></div>
          <Input type="number" value={String(load.qty)} onChange={e => update(load.id, {qty: Math.max(1, Number(e.target.value))})}/>
          <span className={styles.mono}>{load.watts * load.qty} W</span>
          <Input type="number" value={String(load.hours)} onChange={e => update(load.id, {hours: Math.max(0, Number(e.target.value))})}/>
          <button className={styles.selectLike} onClick={() => update(load.id, {period: load.period === 'Day' ? 'Night' : load.period === 'Night' ? 'Both' : 'Day'})}>{load.period}</button>
          <button className={`${styles.priority} ${load.critical ? styles.critical : ''}`} onClick={() => update(load.id, {critical: !load.critical})}>{load.critical ? 'CRITICAL' : 'OCCASIONAL'}</button>
          <button className={styles.iconBtn} onClick={() => setLoads(prev => prev.filter(x => x.id !== load.id))}><Trash2 size={15}/></button>
        </div>)}
      </section>

      <aside className={styles.side}>
        <section className={styles.panel}>
          <div className={styles.sectionTag}>02 / SYSTEM ASSUMPTIONS</div><h2>Sizing inputs</h2>
          <label className={styles.inputField}>
            <div className={styles.labelHead}><span>Average peak sun hours</span><span className={styles.unitTag}>PSH</span></div>
            <Input type="number" value={sunHours} onChange={e => setSunHours(e.target.value)}/>
          </label>
          <label className={styles.inputField}>
            <div className={styles.labelHead}><span>Backup duration</span><span className={styles.unitTag}>HOURS</span></div>
            <Input type="number" value={backup} onChange={e => setBackup(e.target.value)}/>
          </label>
          <label className={styles.inputField}>
            <div className={styles.labelHead}><span>Battery system voltage</span><span className={styles.unitTag}>VDC</span></div>
            <Input type="number" value={systemVoltage} onChange={e => setSystemVoltage(e.target.value)}/>
          </label>
          <div className={styles.fixed}><ShieldCheck size={17}/><div><b>25% safety margin</b><p>Fixed engineering headroom applied to inverter and solar array sizing.</p></div></div>
        </section>
        <section className={styles.resultPanel}>
          <div className={styles.sectionTag}>03 / RECOMMENDATION</div><h2>System sizing</h2>
          <Result label="Inverter" value={`${(totals.inverter/1000).toFixed(1)} kVA`} detail={`${Math.round(totals.peak).toLocaleString()} W peak + 25% margin`}/>
          <Result label="Battery bank" value={`${totals.battery.toFixed(1)} kWh`} detail={`${Math.round((totals.battery * 1000) / Number(systemVoltage))} Ah @ ${systemVoltage} V`}/>
          <Result label="Solar array" value={`${totals.array.toFixed(2)} kWp`} detail={`${totals.panelCount} × 550 W panels`}/>
          <div className={styles.energySplit}><div><span>Night / backup energy</span><b>{totals.nightEnergy.toFixed(2)} kWh</b></div><div><span>Sun hours</span><b>{sunHours} h</b></div></div>
          <Button className={styles.full} onClick={saveEstimate} disabled={saving}><Save size={16}/> {saving ? 'Saving…' : savedId ? 'Estimate saved ✓' : 'Save structured estimate'}</Button>
        </section>
      </aside>
    </div>
    <footer className={styles.footer}><span>LOAD ESTIMATE CALCULATOR · v1</span><span>Safety margin locked at 25% · Surge separated from daily energy</span></footer>
  </main>
}

function Metric({icon,label,value,note,accent=false}:{icon:React.ReactNode;label:string;value:string;note?:string;accent?:boolean}) { 
  return <div className={`${styles.metric} ${accent ? styles.metricAccent : ''}`}>
    <div className={styles.metricIcon}>{icon}</div>
    <div className={styles.metricContent}>
      <span>{label}</span>
      <strong>{value}</strong>
      {note ? <small>{note}</small> : <small className={styles.emptyNote}>&nbsp;</small>}
    </div>
  </div> 
}
function Result({label,value,detail}:{label:string;value:string;detail:string}) { return <div className={styles.result}><span>{label}</span><strong>{value}</strong><small>{detail}</small></div> }

export default App;
