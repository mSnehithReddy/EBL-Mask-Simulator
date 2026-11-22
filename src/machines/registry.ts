import { mbmwExhibit } from './mbmw/mbmwExhibit';
import type { MachineExhibit, MachineId } from './types';
import { vsbExhibit } from './vsb/vsbExhibit';

export interface ExhibitCatalogEntry {
  id: MachineId;
  label: string;
  available: boolean;
  exhibit: MachineExhibit;
}

export const EXHIBIT_CATALOG: ExhibitCatalogEntry[] = [
  {
    id: 'mbmw',
    label: 'MBMW · Multi-Beam Mask Writer',
    available: true,
    exhibit: mbmwExhibit,
  },
  {
    id: 'vsb',
    label: 'VSB · Variable Shaped Beam Writer',
    available: true,
    exhibit: vsbExhibit,
  },
];

export function getExhibitById(id: MachineId): MachineExhibit {
  const entry = EXHIBIT_CATALOG.find((e) => e.id === id);
  return entry?.exhibit ?? mbmwExhibit;
}
