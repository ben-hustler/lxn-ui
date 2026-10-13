export { TooltipController } from './components/tooltip/tooltip-core';
export { Tooltip } from './components/tooltip/Tooltip';
export { useFocusTrap } from './components/focus-trap/useFocusTrap';
export { ButtonMain } from './components/button-main/ButtonMain';
export type { ButtonMainMenuItem } from './components/button-main/ButtonMain';
export { ButtonCard } from './components/button-card/ButtonCard';
export { ConfirmPopover } from './components/confirm-popover/ConfirmPopover';
export {
  ListIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  SearchIcon,
  InfoIcon,
  ExternalArrowIcon,
  ViewOfferIcon,
  BackArrowIcon,
  ChevronDownIcon,
  ChevronsDownIcon,
  AddCircleIcon,
  PlusIcon,
  ResetIcon,
  WarningIcon,
  CloseIcon,
  AutoFixHighIcon,
  PrintIcon,
  CheckCircleIcon,
  CalendarIcon,
  SlidersIcon,
} from './components/icons/icons';
export type { IconProps } from './components/icons/icons';
export { StatusBadge } from './components/status-badge/StatusBadge';
export { PulseDots } from './components/pulse-dots/PulseDots';
export { MultiSelect } from './components/multi-select/MultiSelect';
export type { MultiSelectOption, MultiSelectProps, MultiSelectTriggerArgs } from './components/multi-select/MultiSelect';
export { SingleSelect } from './components/single-select/SingleSelect';
export type { SingleSelectOption, SingleSelectProps, SingleSelectTriggerArgs } from './components/single-select/SingleSelect';
export { DateRangePicker, formatDateRangeLabel, resolveRelativeRange } from './components/date-range-picker/DateRangePicker';
export type { DateRangeValue, DateRangePickerProps } from './components/date-range-picker/DateRangePicker';
export { KpiTile } from './components/kpi-tile/KpiTile';
export type { KpiTileProps, KpiTileTone, KpiTileVariant } from './components/kpi-tile/KpiTile';
export { FilterChip } from './components/filter-chip/FilterChip';
export type { FilterChipProps } from './components/filter-chip/FilterChip';
export { DataTable } from './components/data-table/DataTable';
export type {
  DataTableProps,
  DataTableColumn,
  DataTableColumnGroup,
  DataTableCell,
  DataTableRow,
  DataTableSummaryRow,
  DataTableSummaryTone,
  DataTableSummarySecondary,
} from './components/data-table/DataTable';

// ── DEPRECATED — do not use in new work ─────────────────────────────────────
// Still exported only so existing consumers keep compiling. See README's
// "Deprecated" section for what to use instead.
/** @deprecated Put a bare CloseIcon in a plain button inside the modal card instead. */
export { CloseButton } from './components/close-button/CloseButton';
/** @deprecated Use SingleSelect. */
export { SearchSelect } from './components/search-select/SearchSelect';
export type { SearchSelectOption, SearchSelectProps, SearchSelectTriggerArgs } from './components/search-select/SearchSelect';
