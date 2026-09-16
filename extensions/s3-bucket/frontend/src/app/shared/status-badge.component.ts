import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-status-badge',
  template: `<span class="badge badge-pill badge-{{ style() }} text-capitalize">{{ status() || '—' }}</span>`,
})
export class StatusBadgeComponent {
  readonly status = input<string>();

  protected readonly style = computed(() => {
    const s = (this.status() || '').toLowerCase();
    if (['complete', 'completed', 'ready', 'active', 'available', 'running', 'succeeded', 'ok'].includes(s)) {
      return 'success';
    }
    if (['failed', 'error', 'rejected'].includes(s)) {
      return 'danger';
    }
    if (s === 'blocked') {
      return 'warning';
    }
    if (s) {
      return 'info';
    }
    return 'secondary';
  });
}
