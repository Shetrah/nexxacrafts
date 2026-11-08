/**
 * nexxacrafts UI kit — "Precision Craft". Import everything from '@/components/ui'.
 * Usage rules and the component inventory: docs/DESIGN_SYSTEM.md (section 7).
 */

// Shared types & helpers
export type { BadgeTone, ControlSize } from './types';
export { cn } from '@/lib/cn';
export { buttonClasses } from './buttonStyles';
export type { ButtonClassOptions, ButtonSize, ButtonVariant } from './buttonStyles';
export { getErrorMessage } from './errorMessage';
export { useMediaQuery } from './internal/useMediaQuery';

// Actions
export { Button, ButtonLink } from './Button';
export type {
  AnchorButtonLinkProps,
  ButtonLinkProps,
  ButtonProps,
  ButtonVisualProps,
  RouterButtonLinkProps,
} from './Button';
export { IconButton } from './IconButton';
export type { IconButtonProps } from './IconButton';
export { Kbd } from './Kbd';
export type { KbdProps } from './Kbd';

// Forms
export { Field } from './Field';
export type { FieldProps } from './Field';
export { Input } from './Input';
export type { InputProps } from './Input';
export { Textarea } from './Textarea';
export type { TextareaProps } from './Textarea';
export { Select } from './Select';
export type { SelectOption, SelectProps } from './Select';
export { Checkbox } from './Checkbox';
export type { CheckboxProps } from './Checkbox';
export { Switch } from './Switch';
export type { SwitchProps } from './Switch';
export { OptionGroup } from './OptionGroup';
export type { OptionGroupOption, OptionGroupProps } from './OptionGroup';
export { NumberField } from './NumberField';
export type { NumberFieldProps } from './NumberField';
export { FileDropzone } from './FileDropzone';
export type { FileDropzoneProps } from './FileDropzone';
export { FileItem } from './FileItem';
export type { FileItemProps, FileItemStatus } from './FileItem';
export { SearchInput } from './SearchInput';
export type { SearchInputProps } from './SearchInput';

// Display
export { Card, CardBody, CardFooter, CardHeader } from './Card';
export type { CardBodyProps, CardFooterProps, CardHeaderProps, CardPadding, CardProps, CardTone } from './Card';
export { Badge, StatusBadge } from './Badge';
export type { BadgeProps, StatusBadgeProps } from './Badge';
export { Avatar } from './Avatar';
export type { AvatarProps } from './Avatar';
export { SpecList } from './SpecList';
export type { SpecListItem, SpecListProps } from './SpecList';
export { StatCard } from './StatCard';
export type { StatCardProps, StatTrend } from './StatCard';
export { Timeline } from './Timeline';
export type { TimelineItem, TimelineProps, TimelineState } from './Timeline';
export { ProgressSteps } from './ProgressSteps';
export type { ProgressStepsProps } from './ProgressSteps';
export { Disclosure } from './Disclosure';
export type { DisclosureProps } from './Disclosure';
export { Skeleton } from './Skeleton';
export type { SkeletonProps } from './Skeleton';
export { Spinner } from './Spinner';
export type { SpinnerProps } from './Spinner';

// Navigation
export { TabPanel, Tabs } from './Tabs';
export type { TabItem, TabPanelProps, TabsProps } from './Tabs';
export type { TabVariant } from './internal/tabStyles';
export { NavTabs } from './NavTabs';
export type { NavTabItem, NavTabsProps } from './NavTabs';
export { SegmentedControl } from './SegmentedControl';
export type { SegmentedControlProps, SegmentedOption } from './SegmentedControl';
export { Breadcrumbs } from './Breadcrumbs';
export type { BreadcrumbItem, BreadcrumbsProps } from './Breadcrumbs';
export { Pagination } from './Pagination';
export type { PaginationProps } from './Pagination';
export { Stepper } from './Stepper';
export type { StepperProps, StepperStep } from './Stepper';
export { PageHeader } from './PageHeader';
export type { PageHeaderProps } from './PageHeader';
export { FilterBar } from './FilterBar';
export type { FilterBarProps } from './FilterBar';

// Overlays
export { Modal } from './Modal';
export type { ModalProps } from './Modal';
export { Drawer } from './Drawer';
export type { DrawerProps } from './Drawer';
export { ConfirmDialog } from './ConfirmDialog';
export type { ConfirmDialogProps } from './ConfirmDialog';
export { DropdownMenu } from './DropdownMenu';
export type { DropdownItem, DropdownMenuEntry, DropdownMenuProps } from './DropdownMenu';
export { Tooltip } from './Tooltip';
export type { TooltipProps } from './Tooltip';

// Feedback
export { Alert } from './Alert';
export type { AlertProps, AlertTone } from './Alert';
export { EmptyState } from './EmptyState';
export type { EmptyStateProps } from './EmptyState';
export { ErrorState } from './ErrorState';
export type { ErrorStateProps } from './ErrorState';
export { LoadingState } from './LoadingState';
export type { LoadingStateProps } from './LoadingState';
export { ToastProvider } from './ToastProvider';
export type { ToastProviderProps } from './ToastProvider';
export { useToast } from './useToast';
export type { ToastApi, ToastOptions, ToastTone } from './toastContext';

// Data
export { DataTable } from './DataTable';
export type { Column, DataTableProps, SortDirection, SortState } from './DataTable';

// Layout (public site)
export { Container } from './Container';
export type { ContainerProps } from './Container';
export { Section } from './Section';
export type { SectionProps } from './Section';
export { SectionHeader } from './SectionHeader';
export type { SectionHeaderProps } from './SectionHeader';
export { Eyebrow } from './Eyebrow';
export type { EyebrowProps } from './Eyebrow';
export { CropFrame } from './CropFrame';
export type { CropFrameProps } from './CropFrame';
export { SkipLink } from './SkipLink';
export type { SkipLinkProps } from './SkipLink';
export { VisuallyHidden } from './VisuallyHidden';
export type { VisuallyHiddenProps } from './VisuallyHidden';
