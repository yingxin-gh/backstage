import { type PropDef } from '@/utils/propDefs';

export const breadcrumbEntryDefs: Record<string, PropDef> = {
  label: {
    type: 'string',
    required: true,
    description: 'Display text for the breadcrumb.',
  },
  href: {
    type: 'string',
    required: true,
    description: 'URL the breadcrumb links to.',
  },
};
