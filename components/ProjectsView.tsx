import React, { useState } from 'react';
import { Plus, Phone, MapPin, ArrowRight, Calendar, FolderKanban, Zap, X, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { Project, UserSession, saveProject, getStoredEstimates } from '../helpers/storage';
import { BorexLogo } from './BorexLogo';
import { ProfileMenu } from './ProfileMenu';
import styles from './ProjectsView.module.css';

interface ProjectsViewProps {
  projects: Project[];
  userSession: UserSession;
  onSelectProject: (project: Project) => void;
  onProjectCreated: (project: Project) => void;
  onDeleteProject: (projectId: string) => void;
  onSignOut: () => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projects,
  userSession,
  onSelectProject,
  onProjectCreated,
  onDeleteProject,
  onSignOut
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [projectName, setProjectName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const estimates = getStoredEstimates();

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) return;

    const newProj = saveProject({
      name: projectName.trim(),
      phone: phone.trim() || undefined,
      location: location.trim() || undefined
    });

    setProjectName('');
    setPhone('');
    setLocation('');
    setIsModalOpen(false);

    onProjectCreated(newProj);
  };

  const filteredProjects = projects.filter((p) => {
    const term = searchTerm.toLowerCase();
    return (
      p.name.toLowerCase().includes(term) ||
      (p.phone && p.phone.toLowerCase().includes(term)) ||
      (p.location && p.location.toLowerCase().includes(term))
    );
  });

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <BorexLogo size="md" />
        </div>

        <div className={styles.userSection}>
          <Button onClick={() => setIsModalOpen(true)} className={styles.newProjectBtn}>
            <Plus size={16} /> <span className={styles.newProjectBtnText}>New Project</span>
          </Button>
          <ProfileMenu userSession={userSession} onSignOut={onSignOut} />
        </div>
      </header>

      <section className={styles.heroSection}>
        <div>
          <h1 className={styles.pageTitle}>Projects</h1>
          <p className={styles.pageSubtitle}>
            Select an existing project to inspect its load estimate, or create a new project.
          </p>
        </div>

        {projects.length > 3 && (
          <div className={styles.searchBox}>
            <Input
              type="search"
              placeholder="Search projects by name, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        )}
      </section>

      <div className={styles.projectListSection}>
        <div className={styles.listHeader}>
          <span>ALL PROJECTS ({filteredProjects.length})</span>
          <span>SELECT A PROJECT TO OPEN LOAD ESTIMATE</span>
        </div>

        {filteredProjects.length === 0 ? (
          <div className={styles.emptyState}>
            <FolderKanban size={48} className={styles.emptyIcon} />
            <h3>No projects found</h3>
            <p>Create your first project to get started with load estimation and solar sizing.</p>
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus size={16} /> + New Project
            </Button>
          </div>
        ) : (
          <div className={styles.grid}>
            {filteredProjects.map((project) => {
              const estimate = estimates[project.id];
              const dateFormatted = new Date(project.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              });

              return (
                <div
                  key={project.id}
                  className={styles.projectCard}
                  onClick={() => onSelectProject(project)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectProject(project);
                    }
                  }}
                >
                  <div className={styles.cardHeader}>
                    <div className={styles.cardTitleArea}>
                      <div className={styles.projectIcon}>
                        <FolderKanban size={18} />
                      </div>
                      <div>
                        <h3 className={styles.projectName}>{project.name}</h3>
                        {project.location && (
                          <div className={styles.location}>
                            <MapPin size={12} /> {project.location}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className={styles.cardActions}>
                      <div className={styles.openPill}>
                        <span>Open</span> <ArrowRight size={14} />
                      </div>
                      <button
                        type="button"
                        className={styles.deleteCardBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          setProjectToDelete(project);
                        }}
                        title="Delete project"
                        aria-label="Delete project"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <div className={styles.cardBody}>
                    {project.phone ? (
                      <div className={styles.phoneTag}>
                        <Phone size={13} /> {project.phone}
                      </div>
                    ) : (
                      <div className={styles.phonePlaceholder}>No phone listed</div>
                    )}
                  </div>

                  <div className={styles.cardFooter}>
                    {estimate ? (
                      <div className={styles.estimatePill}>
                        <Zap size={13} />
                        <span>
                          <strong>{(estimate.recommendedInverterKva).toFixed(1)} kVA</strong> · {estimate.dailyEnergyKwh.toFixed(1)} kWh/d
                        </span>
                      </div>
                    ) : (
                      <div className={styles.noEstimatePill}>No estimate saved yet</div>
                    )}

                    <span className={styles.dateTag}>
                      <Calendar size={12} /> {dateFormatted}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {projectToDelete && (
        <div className={styles.modalOverlay} onClick={() => setProjectToDelete(null)}>
          <div className={`${styles.modal} ${styles.deleteModal}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <div className={styles.modalTag} style={{ color: '#f87171' }}>CONFIRM DELETION</div>
                <h2>Delete Project</h2>
              </div>
              <button
                className={styles.closeBtn}
                onClick={() => setProjectToDelete(null)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.deleteConfirmWarning}>
              <AlertTriangle size={20} />
              <div>
                Are you sure you want to delete <strong>"{projectToDelete.name}"</strong>?
                <br />
                This will permanently remove the project and any saved load estimate calculations associated with it.
              </div>
            </div>

            <div className={styles.modalActions}>
              <Button variant="outline" onClick={() => setProjectToDelete(null)}>
                Cancel
              </Button>
              <Button
                className={styles.deleteConfirmBtn}
                onClick={() => {
                  onDeleteProject(projectToDelete.id);
                  setProjectToDelete(null);
                }}
              >
                <Trash2 size={16} /> Delete Project
              </Button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <div className={styles.modalTag}>NEW PROJECT FORM</div>
                <h2>Create New Project</h2>
              </div>
              <button
                className={styles.closeBtn}
                onClick={() => setIsModalOpen(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className={styles.modalForm}>
              <label className={styles.field}>
                <span>PROJECT / CLIENT NAME *</span>
                <Input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Alaba Tech Hub / Chief Obi Residence"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                />
              </label>

              <label className={styles.field}>
                <span>PHONE NUMBER (OPTIONAL)</span>
                <Input
                  type="tel"
                  placeholder="e.g. +234 803 123 4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </label>

              <label className={styles.field}>
                <span>LOCATION (OPTIONAL)</span>
                <Input
                  type="text"
                  placeholder="e.g. Ikeja, Lagos"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </label>

              <div className={styles.modalActions}>
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className={styles.createBtn}>
                  <Plus size={16} /> Create & Open Estimate
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <footer className={styles.footer}>
        <span>BOREX SOLAR ENGINE · PROJECTS LAYER</span>
        <span>Scoped Load Estimates & Engineering Sizing</span>
      </footer>
    </main>
  );
};
