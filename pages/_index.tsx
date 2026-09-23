import React, { useMemo, useState, useEffect } from 'react';
import { Plus, Zap, BatteryCharging, Sun, Gauge, Trash2, Save, ChevronDown, ShieldCheck, ArrowLeft, FolderKanban, Check, Search, X } from 'lucide-react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { postEstimates } from '../endpoints/estimates_POST.schema';
import {
  Project,
  LoadItem,
  UserSession,
  defaultSampleLoads,
  getStoredProjects,
  getStoredUserSession,
  saveUserSession,
  getEstimateForProject,
  saveEstimateForProject,
  deleteProject
} from '../helpers/storage';
import { APPLIANCE_CATALOG, CatalogAppliance } from '../helpers/applianceCatalog';
import { AuthView } from '../components/AuthView';
import { ProjectsView } from '../components/ProjectsView';
import { BorexLogo } from '../components/BorexLogo';
import { ProfileMenu } from '../components/ProfileMenu';
import styles from './_index.module.css';

const presets = [
  ['AC 1 HP', 900, 2.5],
  ['AC 1.5 HP', 1300, 2.5],
  ['AC 2 HP', 1800, 2.5],
  ['Refrigerator', 180, 3],
  ['Freezer', 250, 3],
  ['TV', 120, 1],
  ['Ceiling Fan', 75, 1],
  ['Standing Fan', 80, 1],
  ['LED Light', 12, 1],
  ['Water Pump', 750, 3],
  ['Decoder', 20, 1],
  ['Laptop', 65, 1]
] as const;

const categories = ['All', 'Cooling', 'Kitchen', 'Pumps', 'Laundry', 'Electronics', 'Lighting', 'Security', 'Medical'] as const;

function App() {
  const [userSession, setUserSession] = useState<UserSession | null>(() => getStoredUserSession());
  const [projects, setProjects] = useState<Project[]>(() => getStoredProjects());
  const [currentProject, setCurrentProject] = useState<Project | null>(null);

  // Load estimate state (scoped to current project)
  const [loads, setLoads] = useState<LoadItem[]>([]);
  const [sunHours, setSunHours] = useState('5.0');
  const [backup, setBackup] = useState('12');
  const [systemVoltage, setSystemVoltage] = useState('48');
  const [showPresets, setShowPresets] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [customSearchWatts, setCustomSearchWatts] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  const filteredCatalog = useMemo(() => {
    return APPLIANCE_CATALOG.filter((app) => {
      const matchesCategory = selectedCategory === 'All' || app.category === selectedCategory;
      const matchesQuery =
        !searchQuery.trim() ||
        app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [searchQuery, selectedCategory]);

  // Load project's estimate when opening a project
  const handleSelectProject = (project: Project) => {
    setCurrentProject(project);
    setSavedId(null);
    const existing = getEstimateForProject(project.id);
    if (existing) {
      setLoads(existing.loads);
      setSunHours(String(existing.sunHours));
      setBackup(String(existing.backupHours));
      setSystemVoltage(String(existing.systemVoltage));
      setShowPresets(false);
      setShowSearch(false);
    } else {
      // Each new project comes with a fresh page with no load at all
      setLoads([]);
      setSunHours('5.0');
      setBackup('12');
      setSystemVoltage('48');
      setShowPresets(true);
      setShowSearch(false);
    }
  };

  const handleProjectCreated = (newProject: Project) => {
    setProjects(getStoredProjects());
    handleSelectProject(newProject);
  };

  const handleDeleteProject = (projectId: string) => {
    deleteProject(projectId);
    setProjects(getStoredProjects());
    if (currentProject?.id === projectId) {
      setCurrentProject(null);
    }
  };

  const handleSignOut = () => {
    saveUserSession(null);
    setUserSession(null);
    setCurrentProject(null);
  };

  const handleSignIn = (user: UserSession) => {
    saveUserSession(user);
    setUserSession(user);
    setProjects(getStoredProjects());
    setCurrentProject(null);
  };

  // Sizing calculations — untouched formulas
  const totals = useMemo(() => {
    const connected = loads.reduce((s, l) => s + l.watts * l.qty, 0);
    const daily = loads.reduce((s, l) => s + (l.watts * l.qty * l.hours) / 1000, 0);
    const critical = loads.filter((l) => l.critical).reduce((s, l) => s + l.watts * l.qty * l.surge, 0);
    const occasional = loads.filter((l) => !l.critical).reduce((s, l) => s + l.watts * l.qty * l.surge, 0);
    const peak = critical + occasional * 0.6;
    const inverter = Math.ceil((peak * 1.25) / 500) * 500;
    const nightEnergy = loads.reduce((s, l) => s + (l.period === 'Day' ? 0 : (l.watts * l.qty * l.hours) / 1000), 0);
    const battery = (nightEnergy * Math.min(Number(backup) / 12, 1.5)) / 0.8;
    const array = (daily * 1.25) / Math.max(Number(sunHours), 1);
    const panelCount = Math.ceil((array * 1000) / 550);
    return { connected, daily, peak, inverter, battery, array, panelCount, nightEnergy };
  }, [loads, backup, sunHours]);

  const saveEstimate = async () => {
    if (!currentProject) return;
    setSaving(true);
    setSavedId(null);
    try {
      const estimateData = {
        projectId: currentProject.id,
        clientName: currentProject.name,
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
        loads: loads.map((l) => ({
          applianceName: l.name,
          quantity: l.qty,
          watts: l.watts,
          hoursPerDay: l.hours,
          usagePeriod: l.period,
          critical: l.critical,
          surgeMultiplier: l.surge
        }))
      };

      const result = await postEstimates(estimateData);
      setSavedId(result.id);

      // Persist to local storage tied to project ID
      saveEstimateForProject({
        id: result.id,
        projectId: currentProject.id,
        clientName: currentProject.name,
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
        loads,
        createdAt: new Date().toISOString()
      });
    } finally {
      setSaving(false);
    }
  };

  const addPreset = (name: string, watts: number, surge: number) => {
    setLoads((prev) => [...prev, { id: Date.now(), name, watts, qty: 1, hours: 4, period: 'Day', critical: false, surge }]);
    setShowPresets(false);
  };

  const addCatalogItem = (item: CatalogAppliance) => {
    setLoads((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: item.name,
        watts: item.watts,
        qty: 1,
        hours: item.defaultHours ?? 4,
        period: item.defaultPeriod ?? 'Day',
        critical: item.defaultCritical ?? false,
        surge: item.surge
      }
    ]);
    setShowSearch(false);
    setSearchQuery('');
    setCustomSearchWatts('');
  };

  const update = (id: number, patch: Partial<LoadItem>) =>
    setLoads((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  // If not signed in, show Auth View
  if (!userSession) {
    return <AuthView onSignIn={handleSignIn} />;
  }

  // If no active project selected, show Projects View (landing screen after sign-in)
  if (!currentProject) {
    return (
      <ProjectsView
        projects={projects}
        userSession={userSession}
        onSelectProject={handleSelectProject}
        onProjectCreated={handleProjectCreated}
        onDeleteProject={handleDeleteProject}
        onSignOut={handleSignOut}
      />
    );
  }

  // Load Estimate Screen scoped to currentProject
  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.brandArea}>
          <button className={styles.backBtn} onClick={() => setCurrentProject(null)} title="Back to Projects">
            <ArrowLeft size={16} /> <span>Projects</span>
          </button>
          <div className={styles.brand}>
            <BorexLogo size="md" />
          </div>
        </div>

        {/* Read-only Project Name display */}
        <div className={styles.projectReadonly}>
          <span className={styles.projectReadonlyTag}>PROJECT</span>
          <div className={styles.projectReadonlyName}>
            <FolderKanban size={16} />
            <span>{currentProject.name}</span>
          </div>
        </div>

        <div className={styles.headerActions}>
          <Button onClick={saveEstimate} disabled={saving}>
            {saving ? (
              <>Saving…</>
            ) : savedId ? (
              <>
                <Check size={16} /> Saved
              </>
            ) : (
              <>
                <Save size={16} /> <span className={styles.saveBtnText}>Save estimate</span>
              </>
            )}
          </Button>
          <ProfileMenu userSession={userSession!} onSignOut={handleSignOut} />
        </div>
      </header>

      {/* Mobile-only project name banner (projectReadonly is hidden on mobile) */}
      <div className={styles.projectBanner}>
        <FolderKanban size={15} />
        <span>{currentProject.name}</span>
      </div>

      <section className={styles.metrics}>
        <Metric icon={<Zap />} label="CONNECTED LOAD" value={`${totals.connected.toLocaleString()} W`} />
        <Metric
          icon={<Gauge />}
          label="PEAK / SURGE"
          value={`${Math.round(totals.peak).toLocaleString()} W`}
          note="includes motor starting demand"
        />
        <Metric icon={<BatteryCharging />} label="DAILY ENERGY" value={`${totals.daily.toFixed(2)} kWh`} />
        <Metric
          icon={<Sun />}
          label="RECOMMENDED INVERTER"
          value={`${(totals.inverter / 1000).toFixed(1)} kVA`}
          accent
        />
      </section>

      <div className={styles.grid}>
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <div className={styles.sectionTag}>01 / LOADS</div>
              <h2>Appliance inventory</h2>
            </div>
            <div className={styles.actions}>
              <Button
                variant={showSearch ? 'primary' : 'outline'}
                onClick={() => {
                  setShowSearch((v) => !v);
                  if (!showSearch) setShowPresets(false);
                }}
              >
                <Search size={16} /> Search appliance
              </Button>
              <Button
                variant={showPresets ? 'primary' : 'outline'}
                onClick={() => {
                  setShowPresets((v) => !v);
                  if (!showPresets) setShowSearch(false);
                }}
              >
                <Plus size={16} /> Add appliance <ChevronDown size={14} />
              </Button>
            </div>
          </div>

          {/* Search Appliance Drawer */}
          {showSearch && (
            <div className={styles.searchDrawer}>
              <div className={styles.searchBarWrapper}>
                <Search size={18} className={styles.searchIcon} />
                <input
                  type="search"
                  className={styles.searchInput}
                  placeholder="Search any appliance (e.g. Microwave, Washing machine, Pool pump, Iron)..."
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    type="button"
                    className={styles.searchClearBtn}
                    onClick={() => setSearchQuery('')}
                    title="Clear search"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              <div className={styles.searchCategoryChips}>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={`${styles.searchCategoryChip} ${selectedCategory === cat ? styles.searchCategoryChipActive : ''}`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {filteredCatalog.length > 0 ? (
                <div className={styles.searchResultsGrid}>
                  {filteredCatalog.map((item) => (
                    <div
                      key={item.name}
                      className={styles.searchResultCard}
                      onClick={() => addCatalogItem(item)}
                    >
                      <div className={styles.searchResultInfo}>
                        <span className={styles.searchResultName}>{item.name}</span>
                        <div className={styles.searchResultMeta}>
                          <b>{item.watts} W</b>
                          <span>· Surge ×{item.surge}</span>
                          <span>· {item.category}</span>
                        </div>
                      </div>
                      <span className={styles.searchAddBtn}>+ Add</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.searchCustomPrompt}>
                  <span>
                    No pre-configured appliance found for "<strong>{searchQuery}</strong>". Add it directly as a custom appliance:
                  </span>
                  <div className={styles.searchCustomForm}>
                    <Input
                      placeholder="Appliance name"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <Input
                      placeholder="Watts (e.g. 1500)"
                      type="number"
                      value={customSearchWatts}
                      onChange={(e) => setCustomSearchWatts(e.target.value)}
                    />
                    <Button
                      onClick={() => {
                        const w = Number(customSearchWatts);
                        if (searchQuery.trim() && w > 0) {
                          addPreset(searchQuery.trim(), w, 1.5);
                          setShowSearch(false);
                          setSearchQuery('');
                          setCustomSearchWatts('');
                        }
                      }}
                    >
                      <Plus size={16} /> Add to inventory
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {showPresets && (
            <div className={styles.presets}>
              {presets.map(([name, watts, surge]) => (
                <button key={name} onClick={() => addPreset(name, watts, surge)}>
                  <span>{name}</span>
                  <b>{watts} W</b>
                </button>
              ))}
              <div className={styles.custom}>
                <Input placeholder="Custom appliance" id="custom-name" />
                <Input placeholder="Watts" id="custom-watts" />
                <Button
                  onClick={() => {
                    const n = (document.getElementById('custom-name') as HTMLInputElement)?.value;
                    const w = Number((document.getElementById('custom-watts') as HTMLInputElement)?.value);
                    if (n && w) addPreset(n, w, 1);
                  }}
                >
                  Add custom
                </Button>
              </div>
            </div>
          )}
          <div className={styles.tableHead}>
            <span>APPLIANCE</span>
            <span>QTY</span>
            <span>WATTS</span>
            <span>HOURS / DAY</span>
            <span>WHEN</span>
            <span>PRIORITY</span>
            <span></span>
          </div>
          {loads.length === 0 ? (
            <div className={styles.emptyTable}>
              <p>No appliances added yet. Select from the presets above or add custom appliances.</p>
            </div>
          ) : (
            loads.map((load) => (
            <div className={styles.row} key={load.id}>
              {/* Appliance name — always shown */}
              <div className={styles.appliance}>
                <span className={styles.loadIcon}>
                  <Zap size={14} />
                </span>
                <div>
                  <b>{load.name}</b>
                  <small>Surge ×{load.surge} · {load.watts * load.qty} W</small>
                </div>
              </div>
              {/* Qty */}
              <Input
                type="number"
                value={String(load.qty)}
                onChange={(e) => update(load.id, { qty: Math.max(1, Number(e.target.value)) })}
              />
              {/* Watts */}
              <span className={styles.mono}>{load.watts * load.qty} W</span>
              {/* Hours */}
              <Input
                type="number"
                value={String(load.hours)}
                onChange={(e) => update(load.id, { hours: Math.max(0, Number(e.target.value)) })}
              />
              {/* Period */}
              <button
                className={styles.selectLike}
                onClick={() =>
                  update(load.id, {
                    period: load.period === 'Day' ? 'Night' : load.period === 'Night' ? 'Both' : 'Day'
                  })
                }
              >
                {load.period}
              </button>
              {/* Priority */}
              <button
                className={`${styles.priority} ${load.critical ? styles.critical : ''}`}
                onClick={() => update(load.id, { critical: !load.critical })}
              >
                {load.critical ? 'CRITICAL' : 'OCCASIONAL'}
              </button>
              {/* Delete */}
              <button
                className={styles.iconBtn}
                onClick={() => setLoads((prev) => prev.filter((x) => x.id !== load.id))}
              >
                <Trash2 size={15} />
              </button>
              {/* Mobile-only control row */}
              <div className={styles.mobileRowControls}>
                <Input
                  type="number"
                  value={String(load.qty)}
                  onChange={(e) => update(load.id, { qty: Math.max(1, Number(e.target.value)) })}
                />
                <Input
                  type="number"
                  value={String(load.hours)}
                  onChange={(e) => update(load.id, { hours: Math.max(0, Number(e.target.value)) })}
                />
                <button
                  className={styles.selectLike}
                  onClick={() =>
                    update(load.id, {
                      period: load.period === 'Day' ? 'Night' : load.period === 'Night' ? 'Both' : 'Day'
                    })
                  }
                  style={{ flex: 1 }}
                >
                  {load.period}
                </button>
                <button
                  className={`${styles.priority} ${load.critical ? styles.critical : ''}`}
                  onClick={() => update(load.id, { critical: !load.critical })}
                  style={{ flex: 1 }}
                >
                  {load.critical ? 'CRIT' : 'OCC'}
                </button>
                <button
                  className={styles.iconBtn}
                  onClick={() => setLoads((prev) => prev.filter((x) => x.id !== load.id))}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          )))}
        </section>

        <aside className={styles.side}>
          <section className={styles.panel}>
            <div className={styles.sectionTag}>02 / SYSTEM ASSUMPTIONS</div>
            <h2>Sizing inputs</h2>
            <label className={styles.inputField}>
              <div className={styles.labelHead}>
                <span>Average peak sun hours</span>
                <span className={styles.unitTag}>PSH</span>
              </div>
              <Input type="number" value={sunHours} onChange={(e) => setSunHours(e.target.value)} />
            </label>
            <label className={styles.inputField}>
              <div className={styles.labelHead}>
                <span>Backup duration</span>
                <span className={styles.unitTag}>HOURS</span>
              </div>
              <Input type="number" value={backup} onChange={(e) => setBackup(e.target.value)} />
            </label>
            <label className={styles.inputField}>
              <div className={styles.labelHead}>
                <span>Battery system voltage</span>
                <span className={styles.unitTag}>VDC</span>
              </div>
              <Input type="number" value={systemVoltage} onChange={(e) => setSystemVoltage(e.target.value)} />
            </label>
            <div className={styles.fixed}>
              <ShieldCheck size={17} />
              <div>
                <b>25% safety margin</b>
                <p>Fixed engineering headroom applied to inverter and solar array sizing.</p>
              </div>
            </div>
          </section>
          <section className={styles.resultPanel}>
            <div className={styles.sectionTag}>03 / RECOMMENDATION</div>
            <h2>System sizing</h2>
            <Result
              label="Inverter"
              value={`${(totals.inverter / 1000).toFixed(1)} kVA`}
              detail={`${Math.round(totals.peak).toLocaleString()} W peak + 25% margin`}
            />
            <Result
              label="Battery bank"
              value={`${totals.battery.toFixed(1)} kWh`}
              detail={`${Math.round((totals.battery * 1000) / Number(systemVoltage))} Ah @ ${systemVoltage} V`}
            />
            <Result
              label="Solar array"
              value={`${totals.array.toFixed(2)} kWp`}
              detail={`${totals.panelCount} × 550 W panels`}
            />
            <div className={styles.energySplit}>
              <div>
                <span>Night / backup energy</span>
                <b>{totals.nightEnergy.toFixed(2)} kWh</b>
              </div>
              <div>
                <span>Sun hours</span>
                <b>{sunHours} h</b>
              </div>
            </div>
            <Button className={styles.full} onClick={saveEstimate} disabled={saving}>
              <Save size={16} />{' '}
              {saving ? 'Saving…' : savedId ? 'Estimate saved ✓' : 'Save structured estimate'}
            </Button>
          </section>
        </aside>
      </div>
      <footer className={styles.footer}>
        <span>LOAD ESTIMATE CALCULATOR · v1</span>
        <span>Safety margin locked at 25% · Surge separated from daily energy</span>
      </footer>
    </main>
  );
}

function Metric({
  icon,
  label,
  value,
  note,
  accent = false
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  note?: string;
  accent?: boolean;
}) {
  return (
    <div className={`${styles.metric} ${accent ? styles.metricAccent : ''}`}>
      <div className={styles.metricIcon}>{icon}</div>
      <div className={styles.metricContent}>
        <span>{label}</span>
        <strong>{value}</strong>
        {note ? <small>{note}</small> : <small className={styles.emptyNote}>&nbsp;</small>}
      </div>
    </div>
  );
}

function Result({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className={styles.result}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

export default App;
