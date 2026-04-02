<script lang="ts">
  import { onMount } from 'svelte';
  import type { Department, Device, Project } from '@domain/models/association';
  import { isProjectExpired, formatDateMMDDYYYY } from '@domain/models/association';
  import { associationService, exportImportService } from '@services/container';
  import { currentUserId, currentRole } from '../stores/auth-store';
  import type { UserRole } from '@domain/models/user';

  function getActor() { return { userId: $currentUserId ?? '', role: ($currentRole ?? 'dispatcher') as UserRole }; }

  let departments = $state<Department[]>([]);
  let devices = $state<Device[]>([]);
  let projects = $state<Project[]>([]);
  let selectedDept = $state<Department | null>(null);
  let drawerOpen = $state(false);
  let showExpired = $state(false);
  let editingId = $state<string | null>(null);
  let tab = $state<'departments' | 'devices' | 'projects'>('departments');
  let error = $state('');

  let editName = $state('');
  let editCode = $state('');
  let editTags = $state('');
  let editSampleTypes = $state('');
  let editQueues = $state('');
  let editPrice = $state(0);
  let editDateStart = $state('');
  let editDateEnd = $state('');

  let newName = $state('');
  let newCode = $state('');
  let newSampleTypes = $state('');
  let newQueues = $state('');
  let newSerial = $state('');
  let newDeptId = $state('');
  let newPrice = $state(0);
  let newDateStart = $state(formatDateMMDDYYYY(new Date()));
  let newDateEnd = $state(formatDateMMDDYYYY(new Date(Date.now() + 365 * 86400000)));
  let showNewForm = $state(false);

  async function loadAll() {
    departments = await associationService.listDepartments();
    devices = await associationService.listDevices();
    projects = await associationService.listProjects();
  }

  onMount(loadAll);

  let filteredProjects = $derived(
    showExpired ? projects : projects.filter((p) => !isProjectExpired(p))
  );

  function startEdit(item: Department | Device | Project) {
    editingId = item.id;
    editName = item.name;
    editTags = ('tags' in item ? item.tags : []).join(', ');
    if ('code' in item) { editCode = (item as Department).code; editSampleTypes = (item as Department).sampleTypes.join(', '); editQueues = (item as Department).executionQueues.join(', '); }
    if ('priceUsd' in item) { editPrice = (item as Project).priceUsd; editDateStart = (item as Project).effectiveDateStart; editDateEnd = (item as Project).effectiveDateEnd; }
  }

  async function saveDepartment(dept: Department) {
    const updated: Department = { ...dept, name: editName, code: editCode, tags: editTags.split(',').map(s => s.trim()).filter(Boolean), sampleTypes: editSampleTypes.split(',').map(s => s.trim()).filter(Boolean), executionQueues: editQueues.split(',').map(s => s.trim()).filter(Boolean), updatedAt: Date.now() };
    await associationService.saveDepartment(updated, getActor());
    editingId = null;
    await loadAll();
  }

  async function saveDevice(dev: Device) {
    const updated: Device = { ...dev, name: editName, tags: editTags.split(',').map(s => s.trim()).filter(Boolean), updatedAt: Date.now() };
    await associationService.saveDevice(updated, getActor());
    editingId = null;
    await loadAll();
  }

  async function saveProject(proj: Project) {
    const updated: Project = { ...proj, name: editName, priceUsd: editPrice, effectiveDateStart: editDateStart, effectiveDateEnd: editDateEnd, tags: editTags.split(',').map(s => s.trim()).filter(Boolean), updatedAt: Date.now() };
    await associationService.saveProject(updated, getActor());
    editingId = null;
    await loadAll();
  }

  async function toggleValid(proj: Project) {
    await associationService.saveProject({ ...proj, isValid: !proj.isValid, updatedAt: Date.now() }, getActor());
    await loadAll();
  }

  async function toggleActive(item: Department | Device) {
    if ('code' in item) await associationService.saveDepartment({ ...item, isActive: !item.isActive, updatedAt: Date.now() }, getActor());
    else await associationService.saveDevice({ ...(item as Device), isActive: !(item as Device).isActive, updatedAt: Date.now() }, getActor());
    await loadAll();
  }

  function openDrawer(dept: Department) { selectedDept = dept; drawerOpen = true; }
  function closeDrawer() { drawerOpen = false; selectedDept = null; }
  function handleDrawerKeydown(e: KeyboardEvent) { if (e.key === 'Escape') closeDrawer(); }

  async function addNew() {
    error = '';
    try {
      if (tab === 'departments') {
        const st = newSampleTypes.split(',').map(s => s.trim()).filter(Boolean);
        const eq = newQueues.split(',').map(s => s.trim()).filter(Boolean);
        await associationService.createDepartment(newName, newCode, st, eq, getActor());
      } else if (tab === 'devices') {
        await associationService.createDevice(newName, newDeptId, newSerial, getActor());
      } else {
        await associationService.createProject({ name: newName, departmentId: newDeptId, effectiveDateStart: newDateStart, effectiveDateEnd: newDateEnd, priceUsd: newPrice }, getActor());
      }
      newName = ''; newCode = ''; newSampleTypes = ''; newQueues = ''; newSerial = ''; newDeptId = ''; newPrice = 0;
      showNewForm = false;
      await loadAll();
    } catch (e) { error = e instanceof Error ? e.message : 'Failed'; }
  }

  async function handleExport() {
    const blob = await exportImportService.exportToJson();
    exportImportService.triggerDownload(blob, `transitops-export-${new Date().toISOString().slice(0,10)}.json`);
  }

  let importInput: HTMLInputElement;
  async function handleImport() {
    const file = importInput?.files?.[0];
    if (!file) return;
    try {
      const result = await exportImportService.importFromJson(file);
      error = result.errors.length > 0 ? result.errors.join('; ') : '';
      await loadAll();
    } catch (e) { error = e instanceof Error ? e.message : 'Import failed'; }
  }
</script>

<section class="admin">
  <div class="admin-header">
    <h2>Admin Configuration Console</h2>
    <div class="admin-actions">
      <button class="export-btn" onclick={handleExport}>Export JSON</button>
      <label class="import-btn">Import JSON <input type="file" accept=".json" bind:this={importInput} onchange={handleImport} hidden /></label>
    </div>
  </div>

  {#if error}<p class="error">{error}</p>{/if}

  <div class="tabs">
    <button class:active={tab === 'departments'} onclick={() => tab = 'departments'}>Departments</button>
    <button class:active={tab === 'devices'} onclick={() => tab = 'devices'}>Devices</button>
    <button class:active={tab === 'projects'} onclick={() => tab = 'projects'}>Projects</button>
  </div>

  <div class="toolbar">
    <button class="add-btn" onclick={() => showNewForm = !showNewForm}>+ New {tab.slice(0,-1)}</button>
    {#if tab === 'projects'}
      <label class="toggle-expired"><input type="checkbox" bind:checked={showExpired} /> Show expired</label>
    {/if}
  </div>

  {#if showNewForm}
    <div class="new-form">
      <input placeholder="Name" bind:value={newName} />
      {#if tab === 'departments'}<input placeholder="Code" bind:value={newCode} /><input placeholder="Sample types (comma-sep)" bind:value={newSampleTypes} /><input placeholder="Exec queues (comma-sep)" bind:value={newQueues} />{/if}
      {#if tab === 'devices'}<input placeholder="Serial #" bind:value={newSerial} /><select bind:value={newDeptId}><option value="">Dept...</option>{#each departments as d}<option value={d.id}>{d.name}</option>{/each}</select>{/if}
      {#if tab === 'projects'}<select bind:value={newDeptId}><option value="">Dept...</option>{#each departments as d}<option value={d.id}>{d.name}</option>{/each}</select><input placeholder="Price USD" type="number" bind:value={newPrice} /><input placeholder="Start MM/DD/YYYY" bind:value={newDateStart} /><input placeholder="End MM/DD/YYYY" bind:value={newDateEnd} />{/if}
      <button class="save-btn" onclick={addNew}>Add</button>
    </div>
  {/if}

  <div class="table-wrap">
    <table>
      {#if tab === 'departments'}
        <thead><tr><th>Name</th><th>Code</th><th>Sample Types</th><th>Exec Queues</th><th>Tags</th><th>Active</th><th>Actions</th></tr></thead>
        <tbody>
          {#each departments as dept (dept.id)}
            <tr class:inactive={!dept.isActive}>
              {#if editingId === dept.id}
                <td><input bind:value={editName} /></td>
                <td><input bind:value={editCode} /></td>
                <td><input bind:value={editSampleTypes} placeholder="type1, type2" /></td>
                <td><input bind:value={editQueues} placeholder="queue1, queue2" /></td>
                <td><input bind:value={editTags} placeholder="tag1, tag2" /></td>
                <td><input type="checkbox" checked={dept.isActive} onchange={() => toggleActive(dept)} /></td>
                <td><button class="save-btn" onclick={() => saveDepartment(dept)}>Save</button> <button class="cancel-btn" onclick={() => editingId = null}>Cancel</button></td>
              {:else}
                <td><button class="link-btn" onclick={() => openDrawer(dept)}>{dept.name}</button></td>
                <td>{dept.code}</td>
                <td>{dept.sampleTypes.join(', ') || '—'}</td>
                <td>{dept.executionQueues.join(', ') || '—'}</td>
                <td>{dept.tags.join(', ') || '—'}</td>
                <td>{dept.isActive ? 'Yes' : 'No'}</td>
                <td><button class="edit-btn" onclick={() => startEdit(dept)}>Edit</button></td>
              {/if}
            </tr>
          {/each}
        </tbody>
      {:else if tab === 'devices'}
        <thead><tr><th>Name</th><th>Serial #</th><th>Department</th><th>Tags</th><th>Active</th><th>Actions</th></tr></thead>
        <tbody>
          {#each devices as dev (dev.id)}
            <tr class:inactive={!dev.isActive}>
              {#if editingId === dev.id}
                <td><input bind:value={editName} /></td>
                <td>{dev.serialNumber}</td>
                <td>{departments.find(d => d.id === dev.departmentId)?.name ?? '—'}</td>
                <td><input bind:value={editTags} /></td>
                <td><input type="checkbox" checked={dev.isActive} onchange={() => toggleActive(dev)} /></td>
                <td><button class="save-btn" onclick={() => saveDevice(dev)}>Save</button> <button class="cancel-btn" onclick={() => editingId = null}>Cancel</button></td>
              {:else}
                <td>{dev.name}</td>
                <td>{dev.serialNumber}</td>
                <td>{departments.find(d => d.id === dev.departmentId)?.name ?? '—'}</td>
                <td>{dev.tags.join(', ') || '—'}</td>
                <td>{dev.isActive ? 'Yes' : 'No'}</td>
                <td><button class="edit-btn" onclick={() => startEdit(dev)}>Edit</button></td>
              {/if}
            </tr>
          {/each}
        </tbody>
      {:else}
        <thead><tr><th>Name</th><th>Department</th><th>Price</th><th>Effective</th><th>Valid</th><th>Tags</th><th>Actions</th></tr></thead>
        <tbody>
          {#each filteredProjects as proj (proj.id)}
            <tr class:expired={isProjectExpired(proj)} class:invalid={!proj.isValid}>
              {#if editingId === proj.id}
                <td><input bind:value={editName} /></td>
                <td>{departments.find(d => d.id === proj.departmentId)?.name ?? '—'}</td>
                <td><input type="number" bind:value={editPrice} step="0.01" /></td>
                <td><input bind:value={editDateStart} /> – <input bind:value={editDateEnd} /></td>
                <td><input type="checkbox" checked={proj.isValid} onchange={() => toggleValid(proj)} /></td>
                <td><input bind:value={editTags} /></td>
                <td><button class="save-btn" onclick={() => saveProject(proj)}>Save</button> <button class="cancel-btn" onclick={() => editingId = null}>Cancel</button></td>
              {:else}
                <td>{proj.name}</td>
                <td>{departments.find(d => d.id === proj.departmentId)?.name ?? '—'}</td>
                <td>${proj.priceUsd.toFixed(2)}</td>
                <td>{proj.effectiveDateStart} – {proj.effectiveDateEnd}</td>
                <td>{proj.isValid ? 'Yes' : 'No'}</td>
                <td>{proj.tags.join(', ') || '—'}</td>
                <td><button class="edit-btn" onclick={() => startEdit(proj)}>Edit</button></td>
              {/if}
            </tr>
          {/each}
        </tbody>
      {/if}
    </table>
  </div>

  {#if drawerOpen && selectedDept}
    <div class="drawer-backdrop" role="presentation" onclick={closeDrawer} onkeydown={handleDrawerKeydown}>
      <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
      <div class="drawer" role="dialog" aria-modal="true" aria-label="Department details" tabindex="-1" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
        <div class="drawer-header"><h3>{selectedDept.name}</h3><button onclick={closeDrawer} aria-label="Close">&times;</button></div>
        <div class="drawer-body">
          <p><strong>Code:</strong> {selectedDept.code}</p>
          <p><strong>Active:</strong> {selectedDept.isActive ? 'Yes' : 'No'}</p>
          <h4>Mapped Devices</h4>
          <ul>{#each devices.filter(d => d.departmentId === selectedDept?.id) as dev}<li>{dev.name} ({dev.serialNumber})</li>{:else}<li class="empty">None</li>{/each}</ul>
          <h4>Sample Types</h4>
          <ul>{#each selectedDept.sampleTypes as st}<li>{st}</li>{:else}<li class="empty">None</li>{/each}</ul>
          <h4>Execution Queues</h4>
          <ul>{#each selectedDept.executionQueues as eq}<li>{eq}</li>{:else}<li class="empty">None</li>{/each}</ul>
          <h4>Tags</h4>
          <p>{selectedDept.tags.join(', ') || 'None'}</p>
          <h4>Projects</h4>
          <ul>{#each projects.filter(p => p.departmentId === selectedDept?.id) as p}<li>{p.name} — ${p.priceUsd.toFixed(2)} ({p.effectiveDateStart}–{p.effectiveDateEnd}) {isProjectExpired(p) ? '[EXPIRED]' : ''}</li>{:else}<li class="empty">None</li>{/each}</ul>
        </div>
      </div>
    </div>
  {/if}
</section>

<style>
  .admin { padding: 1.5rem; max-width: 1200px; margin: 0 auto; }
  .admin-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem; }
  h2 { margin: 0; }
  .admin-actions { display: flex; gap: 0.5rem; }
  .export-btn, .import-btn { padding: 0.4rem 0.8rem; background: #8be9fd; color: #282a36; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.8rem; }
  .tabs { display: flex; gap: 0; margin-bottom: 1rem; }
  .tabs button { padding: 0.5rem 1.2rem; background: #44475a; color: #ccc; border: none; cursor: pointer; font-weight: 500; }
  .tabs button:first-child { border-radius: 6px 0 0 6px; }
  .tabs button:last-child { border-radius: 0 6px 6px 0; }
  .tabs button.active { background: #6272a4; color: #f8f8f2; }
  .toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.8rem; }
  .add-btn { padding: 0.4rem 0.8rem; background: #50fa7b; color: #282a36; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.85rem; }
  .toggle-expired { font-size: 0.85rem; color: #ccc; display: flex; align-items: center; gap: 0.3rem; }
  .new-form { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1rem; padding: 0.8rem; background: #282a36; border-radius: 8px; border: 1px solid #44475a; }
  .new-form input, .new-form select { padding: 0.4rem; background: #1a1a2e; border: 1px solid #44475a; border-radius: 4px; color: #f8f8f2; font-size: 0.85rem; }
  .table-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
  th { text-align: left; padding: 0.5rem; border-bottom: 2px solid #44475a; color: #8be9fd; font-weight: 600; }
  td { padding: 0.4rem 0.5rem; border-bottom: 1px solid #333; }
  tr.inactive { opacity: 0.5; }
  tr.expired { opacity: 0.4; background: rgba(255, 85, 85, 0.05); }
  tr.invalid td { color: #ff5555; }
  td input { padding: 0.2rem 0.4rem; background: #1a1a2e; border: 1px solid #44475a; border-radius: 3px; color: #f8f8f2; font-size: 0.8rem; width: 100%; }
  td input[type="number"] { width: 70px; }
  td input[type="checkbox"] { width: auto; }
  .edit-btn { padding: 0.2rem 0.5rem; background: none; border: 1px solid #6272a4; color: #8be9fd; border-radius: 4px; cursor: pointer; font-size: 0.75rem; }
  .save-btn { padding: 0.2rem 0.5rem; background: #50fa7b; color: #282a36; border: none; border-radius: 4px; cursor: pointer; font-size: 0.75rem; font-weight: 600; }
  .cancel-btn { padding: 0.2rem 0.5rem; background: none; border: 1px solid #666; color: #ccc; border-radius: 4px; cursor: pointer; font-size: 0.75rem; }
  .link-btn { background: none; border: none; color: #8be9fd; cursor: pointer; text-decoration: underline; font-size: 0.85rem; padding: 0; }
  .error { color: #ff5555; font-size: 0.85rem; }
  .drawer-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 100; display: flex; justify-content: flex-end; }
  .drawer { width: 400px; max-width: 90vw; background: #282a36; height: 100vh; overflow-y: auto; padding: 0; box-shadow: -4px 0 20px rgba(0,0,0,0.5); }
  .drawer-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.5rem; border-bottom: 1px solid #44475a; }
  .drawer-header h3 { margin: 0; color: #8be9fd; }
  .drawer-header button { background: none; border: none; color: #f8f8f2; font-size: 1.5rem; cursor: pointer; }
  .drawer-body { padding: 1.5rem; }
  .drawer-body p { margin: 0.3rem 0; font-size: 0.9rem; color: #ccc; }
  .drawer-body h4 { margin: 1rem 0 0.3rem; color: #ffb86c; font-size: 0.85rem; }
  .drawer-body ul { margin: 0; padding-left: 1.2rem; }
  .drawer-body li { font-size: 0.85rem; color: #ccc; margin: 0.2rem 0; }
  .drawer-body li.empty { color: #666; font-style: italic; }
</style>
