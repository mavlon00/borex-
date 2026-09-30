import React, { useMemo, useState } from 'react';
import { Plus, Zap, BatteryCharging, Sun, Gauge, Trash2, Save, ChevronDown, ShieldCheck, ArrowLeft, FolderKanban, Check, Search, X, Home, AlertTriangle, Layers } from 'lucide-react';
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

// ─── Engineering constants — source of truth — do not duplicate elsewhere ──────
// BATTERY_DOD corrected 2026-09-25: 0.90 (LiFePO4) replaces old 0.80 (lead-acid).
// See ENGINEERING_CHANGELOG.md for full rationale.
const BATTERY_DOD = 0.9;
// Approximate Nigerian market rates — defaults only; engineer can override in the UI.
// ₦120k/kVA inverter, ₦180k/kWh LiFePO4 battery, ₦100k/kWp solar+mounting.
const DEFAULT_RATE_KVA  = 120_000;
const DEFAULT_RATE_KWH  = 180_000;
const DEFAULT_RATE_KWP  = 100_000;

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
  /** Which loads count toward night/battery sizing: 'whole-house' | 'essential' */
  const [backupMode, setBackupMode] = useState<'whole-house' | 'essential'>('whole-house');
  /** Optional project budget (local currency). Enables Option B/C tier display. */
  const [budget, setBudget] = useState('');
  // Cost unit-rate overrides (engineer-editable; default = Nigerian market rates)
  const [ratePerKva, setRatePerKva] = useState(String(DEFAULT_RATE_KVA));
  const [ratePerKwh, setRatePerKwh] = useState(String(DEFAULT_RATE_KWH));
  const [ratePerKwp, setRatePerKwp] = useState(String(DEFAULT_RATE_KWP));
  const [showRates, setShowRates] = useState(false);

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
      setBackupMode(existing.backupMode ?? 'whole-house');
      setBudget(existing.budget ? String(existing.budget) : '');
      setShowPresets(false);
      setShowSearch(false);
    } else {
      // Each new project comes with a fresh page with no load at all
      setLoads([]);
      setSunHours('5.0');
      setBackup('12');
      setSystemVoltage('48');
      setBackupMode('whole-house');
      setBudget('');
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


  // ─── Deterministic sizing engine (all numbers come from here — no AI involved) ─
  const totals = useMemo(() => {
    const connected = loads.reduce((s, l) => s + l.watts * l.qty, 0);
    const daily = loads.reduce((s, l) => s + (l.watts * l.qty * l.hours) / 1000, 0);
    const critical = loads.filter((l) => l.critical).reduce((s, l) => s + l.watts * l.qty * l.surge, 0);
    const occasional = loads.filter((l) => !l.critical).reduce((s, l) => s + l.watts * l.qty * l.surge, 0);
    const peak = critical + occasional * 0.6;
    const inverter = Math.ceil((peak * 1.25) / 500) * 500;

    // Night/backup energy: filtered by backupMode.
    // whole-house: all non-Day loads count (previous/default behaviour).
    // essential: only CRITICAL non-Day loads count — occasional loads are excluded
    //            from battery sizing because they won't run during an outage.
    const nightEnergy = loads.reduce((s, l) => {
      if (l.period === 'Day') return s;
      if (backupMode === 'essential' && !l.critical) return s; // skip occasional in essential mode
      return s + (l.watts * l.qty * l.hours) / 1000;
    }, 0);

    // Battery: corrected DoD=0.90 (LiFePO4). backupFactor scales up to 1.5× for
    // backup durations longer than 12 h (unchanged from original formula logic).
    const backupFactor = Math.min(Number(backup) / 12, 1.5);
    const battery = (nightEnergy * backupFactor) / BATTERY_DOD;

    const array = (daily * 1.25) / Math.max(Number(sunHours), 1);
    const panelCount = Math.ceil((array * 1000) / 550);
    return { connected, daily, peak, inverter, battery, array, panelCount, nightEnergy };
  }, [loads, backup, sunHours, backupMode]);

  // ─── Cost estimation (deterministic; rates overrideable by engineer) ──────────
  const rKva = Math.max(Number(ratePerKva) || DEFAULT_RATE_KVA, 0);
  const rKwh = Math.max(Number(ratePerKwh) || DEFAULT_RATE_KWH, 0);
  const rKwp = Math.max(Number(ratePerKwp) || DEFAULT_RATE_KWP, 0);

  const inverterCost = Math.round((totals.inverter / 1000) * rKva);
  const batteryCost  = Math.round(totals.battery * rKwh);
  const solarCost    = Math.round(totals.array   * rKwp);
  const optionACost  = inverterCost + batteryCost + solarCost;

  // ─── Option B/C: budget-tiered alternatives ───────────────────────────────────
  // Only generated when budget is set AND below Option A cost.
  // Inverter is NEVER reduced (safety floor; see ENGINEERING_CHANGELOG.md).
  const budgetNum = budget ? Number(budget) : 0;
  const showTiers = budgetNum > 0 && budgetNum < optionACost;

  const optionBBattery    = totals.battery * 0.6;
  const optionBSolar      = totals.array   * 0.75;
  const optionBPanelCount = Math.ceil((optionBSolar * 1000) / 550);
  const optionBBackupH    = Number(backup) * 0.6;
  const optionBCost = Math.round(
    (totals.inverter / 1000) * rKva +
    optionBBattery           * rKwh +
    optionBSolar             * rKwp
  );

  const optionCBattery      = totals.battery * 0.5;
  const optionCSolar        = totals.array   * 0.5;
  const optionCPanelCount   = Math.ceil((optionCSolar * 1000) / 550);
  const optionCBackupH      = Number(backup) * 0.5;
  const optionCPhase1Cost = Math.round(
    (totals.inverter / 1000) * rKva +
    optionCBattery           * rKwh +
    optionCSolar             * rKwp
  );
  const optionCPhase2Cost = Math.round(
    optionCBattery * rKwh +
    optionCSolar   * rKwp
  );

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
        overrides: [] as any[],
        backupMode,
        budget: budgetNum > 0 ? budgetNum : undefined,
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
        createdAt: new Date().toISOString(),
        backupMode,
        budget: budgetNum > 0 ? budgetNum : undefined
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
              <>
                <Save size={16} /> <span className={styles.saveBtnText}>Saving…</span>
              </>
            ) : savedId ? (
              <>
                <Check size={16} /> <span className={styles.saveBtnText}>Saved</span>
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
              <div className={styles.sectionTag}>LOADS</div>
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
              {/* Appliance details */}
              <div className={styles.appliance}>
                <span className={styles.loadIcon}>
                  <Zap size={14} />
                </span>
                <div className={styles.applianceDetails}>
                  <div className={styles.applianceTop}>
                    <b>{load.name}</b>
                    {/* Mobile-only prominent delete button */}
                    <button
                      type="button"
                      className={styles.mobileDeleteBtn}
                      onClick={() => setLoads((prev) => prev.filter((x) => x.id !== load.id))}
                      aria-label={`Delete ${load.name}`}
                      title="Delete appliance"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className={styles.applianceMeta}>
                    <span>Surge ×{load.surge}</span>
                    <span className={styles.metaDot}>·</span>
                    <span className={styles.mobileWattsBadge}>{load.watts * load.qty} W</span>
                    {load.qty > 1 && <span className={styles.mobileEachWatts}>({load.watts} W ea)</span>}
                  </div>
                </div>
              </div>

              {/* Controls: display:contents on desktop (fits grid columns), responsive 2x2 grid on mobile */}
              <div className={styles.controlsGrid}>
                {/* Qty */}
                <div className={styles.controlCell}>
                  <span className={styles.controlCellLabel}>QTY</span>
                  <Input
                    type="number"
                    value={String(load.qty)}
                    onChange={(e) => update(load.id, { qty: Math.max(1, Number(e.target.value)) })}
                  />
                </div>

                {/* Watts (desktop only table column) */}
                <span className={`${styles.mono} ${styles.desktopOnly}`}>{load.watts * load.qty} W</span>

                {/* Hours */}
                <div className={styles.controlCell}>
                  <span className={styles.controlCellLabel}>HOURS/DAY</span>
                  <Input
                    type="number"
                    value={String(load.hours)}
                    onChange={(e) => update(load.id, { hours: Math.max(0, Number(e.target.value)) })}
                  />
                </div>

                {/* Period */}
                <div className={styles.controlCell}>
                  <span className={styles.controlCellLabel}>PERIOD</span>
                  <button
                    type="button"
                    className={styles.selectLike}
                    onClick={() =>
                      update(load.id, {
                        period: load.period === 'Day' ? 'Night' : load.period === 'Night' ? 'Both' : 'Day'
                      })
                    }
                  >
                    {load.period}
                  </button>
                </div>

                {/* Priority */}
                <div className={styles.controlCell}>
                  <span className={styles.controlCellLabel}>PRIORITY</span>
                  <button
                    type="button"
                    className={`${styles.priority} ${load.critical ? styles.critical : ''}`}
                    onClick={() => update(load.id, { critical: !load.critical })}
                  >
                    {load.critical ? 'CRITICAL' : 'OCCASIONAL'}
                  </button>
                </div>
              </div>

              {/* Desktop Delete button */}
              <button
                type="button"
                className={`${styles.iconBtn} ${styles.desktopOnly}`}
                onClick={() => setLoads((prev) => prev.filter((x) => x.id !== load.id))}
                aria-label={`Delete ${load.name}`}
                title="Delete appliance"
              >
                <Trash2 size={15} />
              </button>
            </div>
          )))}
        </section>

        <aside className={styles.side}>
          <section className={styles.panel}>
            <div className={styles.sectionTag}>SYSTEM ASSUMPTIONS</div>
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

            {/* Backup mode selector */}
            <div className={styles.inputField}>
              <div className={styles.labelHead}>
                <span>Backup scope</span>
                <span className={styles.unitTag}>BATTERY MODE</span>
              </div>
              <div className={styles.modeToggle}>
                <button
                  id="mode-whole-house"
                  type="button"
                  className={`${styles.modeBtn} ${backupMode === 'whole-house' ? styles.modeBtnActive : ''}`}
                  onClick={() => { setBackupMode('whole-house'); setSavedId(null); }}
                >
                  <Home size={13} /> Whole-house
                </button>
                <button
                  id="mode-essential"
                  type="button"
                  className={`${styles.modeBtn} ${backupMode === 'essential' ? styles.modeBtnActive : ''}`}
                  onClick={() => { setBackupMode('essential'); setSavedId(null); }}
                >
                  <ShieldCheck size={13} /> Essential-load
                </button>
              </div>
              <p className={styles.modeHint}>
                {backupMode === 'essential'
                  ? 'Only CRITICAL appliances counted for battery. Occasional loads excluded from backup energy.'
                  : 'All appliances (including occasional) counted toward battery backup energy.'}
              </p>
            </div>

            {/* Optional budget field */}
            <label className={styles.inputField}>
              <div className={styles.labelHead}>
                <span>Project budget (optional)</span>
                <span className={styles.unitTag}>₦ OPTIONAL</span>
              </div>
              <Input
                id="project-budget"
                type="number"
                placeholder="e.g. 2500000"
                value={budget}
                onChange={(e) => { setBudget(e.target.value); setSavedId(null); }}
              />
            </label>

            <div className={styles.fixed}>
              <ShieldCheck size={17} />
              <div>
                <b>25% safety margin</b>
                <p>Fixed engineering headroom applied to inverter and solar array sizing.</p>
              </div>
            </div>

            {/* Cost unit-rate overrides */}
            <div className={styles.inputField}>
              <button
                type="button"
                className={styles.ratesToggle}
                onClick={() => setShowRates(v => !v)}
              >
                <span>Cost unit rates</span>
                <span className={styles.ratesFormula}>
                  ₦{inverterCost.toLocaleString()} + ₦{batteryCost.toLocaleString()} + ₦{solarCost.toLocaleString()}
                </span>
                <ChevronDown size={13} className={showRates ? styles.ratesChevronOpen : ''} />
              </button>
              {showRates && (
                <div className={styles.ratesPanel}>
                  <p className={styles.modeHint}>Edit any rate to correct the cost estimate. Formula: (inverter kVA × ₦/kVA) + (battery kWh × ₦/kWh) + (solar kWp × ₦/kWp).</p>
                  <div className={styles.ratesGrid}>
                    <label className={styles.rateField}>
                      <span className={styles.rateLabel}>Inverter ₦/kVA</span>
                      <Input
                        id="rate-kva"
                        type="number"
                        value={ratePerKva}
                        onChange={e => { setRatePerKva(e.target.value); setSavedId(null); }}
                      />
                      <span className={styles.rateCalc}>{(totals.inverter / 1000).toFixed(1)} kVA × ₦{Number(ratePerKva).toLocaleString()} = <b>₦{inverterCost.toLocaleString()}</b></span>
                    </label>
                    <label className={styles.rateField}>
                      <span className={styles.rateLabel}>Battery ₦/kWh</span>
                      <Input
                        id="rate-kwh"
                        type="number"
                        value={ratePerKwh}
                        onChange={e => { setRatePerKwh(e.target.value); setSavedId(null); }}
                      />
                      <span className={styles.rateCalc}>{totals.battery.toFixed(1)} kWh × ₦{Number(ratePerKwh).toLocaleString()} = <b>₦{batteryCost.toLocaleString()}</b></span>
                    </label>
                    <label className={styles.rateField}>
                      <span className={styles.rateLabel}>Solar ₦/kWp</span>
                      <Input
                        id="rate-kwp"
                        type="number"
                        value={ratePerKwp}
                        onChange={e => { setRatePerKwp(e.target.value); setSavedId(null); }}
                      />
                      <span className={styles.rateCalc}>{totals.array.toFixed(2)} kWp × ₦{Number(ratePerKwp).toLocaleString()} = <b>₦{solarCost.toLocaleString()}</b></span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* ─── Results panel: Option A (always shown) ──────── */}
          <section className={styles.resultPanel}>
            <div className={styles.sectionTag}>RECOMMENDATION</div>
            <div className={styles.optionHeader}>
              <h2>Option A — Full system</h2>
              <span className={`${styles.modeBadge} ${backupMode === 'essential' ? styles.modeBadgeEssential : styles.modeBadgeWhole}`}>
                {backupMode === 'essential' ? <><ShieldCheck size={11} /> Essential-load</> : <><Home size={11} /> Whole-house</>}
              </span>
            </div>
            <Result
              label="Inverter"
              value={`${(totals.inverter / 1000).toFixed(1)} kVA`}
              detail={`${Math.round(totals.peak).toLocaleString()} W peak + 25% margin`}
            />
            <Result
              label="Battery bank"
              value={`${totals.battery.toFixed(1)} kWh`}
              detail={`${Math.round((totals.battery * 1000) / Number(systemVoltage))} Ah @ ${systemVoltage} V · DoD 90%`}
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
                <span>Est. cost (approx.)</span>
                <b>₦{optionACost.toLocaleString()}</b>
              </div>
            </div>
            <Button className={styles.full} onClick={saveEstimate} disabled={saving}>
              <Save size={16} />{' '}
              {saving ? 'Saving…' : savedId ? 'Estimate saved ✓' : 'Save structured estimate'}
            </Button>
          </section>

          {/* ─── Option B: reduced cost (only when budget < Option A) ── */}
          {showTiers && (
            <section className={styles.tierPanel}>
              <div className={styles.tierHeader}>
                <div>
                  <div className={styles.sectionTag} style={{ color: 'rgba(251, 191, 36, 0.9)' }}>OPTION B — REDUCED COST</div>
                  <h2 className={styles.tierTitle}>Smaller battery &amp; solar</h2>
                </div>
                <span className={styles.tierCostBadge}>₦{optionBCost.toLocaleString()}</span>
              </div>
              <div className={styles.tierWarning}>
                <AlertTriangle size={14} />
                <span>Not equivalent to Option A. Backup duration reduced to ~{optionBBackupH.toFixed(1)} h (was {backup} h). Lower daily self-sufficiency.</span>
              </div>
              <div className={styles.tierRows}>
                <TierRow label="Inverter" value={`${(totals.inverter / 1000).toFixed(1)} kVA`} note="unchanged — sized for full load" />
                <TierRow label="Battery" value={`${optionBBattery.toFixed(1)} kWh`} note={`${Math.round((optionBBattery * 1000) / Number(systemVoltage))} Ah @ ${systemVoltage} V`} reduced />
                <TierRow label="Solar" value={`${optionBSolar.toFixed(2)} kWp`} note={`${optionBPanelCount} × 550 W panels`} reduced />
              </div>
            </section>
          )}

          {/* ─── Option C: phased installation (only when budget < Option A) ── */}
          {showTiers && (
            <section className={styles.tierPanel}>
              <div className={styles.tierHeader}>
                <div>
                  <div className={styles.sectionTag} style={{ color: 'rgba(167, 139, 250, 0.9)' }}>OPTION C — PHASED INSTALL</div>
                  <h2 className={styles.tierTitle}>Install now, expand later</h2>
                </div>
                <span className={`${styles.tierCostBadge} ${styles.tierCostBadgePurple}`}>₦{optionCPhase1Cost.toLocaleString()}</span>
              </div>
              <div className={styles.tierWarning} style={{ borderColor: 'rgba(167, 139, 250, 0.3)', background: 'rgba(167, 139, 250, 0.08)' }}>
                <Layers size={14} style={{ color: 'rgba(167, 139, 250, 0.9)' }} />
                <span>Phase 1 now (₦{optionCPhase1Cost.toLocaleString()}) · Phase 2 later (₦{optionCPhase2Cost.toLocaleString()}). Phase 1 backup ~{optionCBackupH.toFixed(1)} h. Inverter is full-size from day one — never undersized.</span>
              </div>
              <div className={styles.tierRows}>
                <TierRow label="Inverter (Phase 1)" value={`${(totals.inverter / 1000).toFixed(1)} kVA`} note="full-size, correct for all loads" />
                <TierRow label="Battery (Phase 1)" value={`${optionCBattery.toFixed(1)} kWh`} note={`${Math.round((optionCBattery * 1000) / Number(systemVoltage))} Ah · add ${optionCBattery.toFixed(1)} kWh in Phase 2`} reduced />
                <TierRow label="Solar (Phase 1)" value={`${optionCSolar.toFixed(2)} kWp`} note={`${optionCPanelCount} panels · add ${optionCPanelCount} more in Phase 2`} reduced />
              </div>
            </section>
          )}
        </aside>
      </div>
      <footer className={styles.footer}>
        <span>LOAD ESTIMATE CALCULATOR · v2 · DoD 90%</span>
        <span>Safety margin locked at 25% · Surge model: see ENGINEERING_CHANGELOG.md</span>
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

function TierRow({ label, value, note, reduced }: { label: string; value: string; note: string; reduced?: boolean }) {
  return (
    <div className={styles.tierRow}>
      <span className={styles.tierRowLabel}>{label}</span>
      <span className={`${styles.tierRowValue} ${reduced ? styles.tierRowValueReduced : ''}`}>{value}</span>
      <span className={styles.tierRowNote}>{note}</span>
    </div>
  );
}

export default App;
