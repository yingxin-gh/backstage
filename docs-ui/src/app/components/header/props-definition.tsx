import { classNamePropDefs, type PropDef } from '@/utils/propDefs';

export const headerPagePropDefs: Record<string, PropDef> = {
  title: {
    type: 'string',
    description: 'Page heading displayed in the header.',
  },
  tags: {
    type: 'complex',
    description:
      'Items displayed above the title. Each tag renders as a link when href is provided, or as plain text otherwise. Tags are separated by a small circle divider.',
    complexType: {
      name: 'HeaderTag[]',
      properties: {
        label: {
          type: 'string',
          required: true,
          description: 'Display text for the tag.',
        },
        href: {
          type: 'string',
          required: false,
          description: 'URL to navigate to when the tag is clicked.',
        },
      },
    },
  },
  description: {
    type: 'string',
    description:
      'Markdown string rendered below the title. Only inline elements are supported: links, bold, and italic. Block-level markdown such as headings or lists is not rendered.',
  },
  metadata: {
    type: 'complex',
    description: 'Key-value pairs displayed below the description.',
    complexType: {
      name: 'HeaderMetadataItem[]',
      properties: {
        label: {
          type: 'string',
          required: true,
          description: 'The key label, displayed in bold.',
        },
        value: {
          type: 'ReactNode',
          required: true,
          description: 'The value to display alongside the label.',
        },
      },
    },
  },
  customActions: {
    type: 'enum',
    values: ['ReactNode'],
    description: 'Custom elements rendered in the actions area.',
  },
  tabs: {
    type: 'complex',
    description: 'Navigation items displayed below the title.',
    complexType: {
      name: 'HeaderNavTabItem[]',
      properties: {
        id: {
          type: 'string',
          required: true,
          description: 'Unique identifier for the tab.',
        },
        label: {
          type: 'string',
          required: true,
          description: 'Display text for the tab.',
        },
        href: {
          type: 'string',
          required: false,
          description:
            'URL to navigate to when tab is clicked. Present on flat tabs, absent on groups.',
        },
        items: {
          type: 'HeaderNavTab[]',
          required: false,
          description:
            'Child tabs rendered as a dropdown menu. Present on groups, absent on flat tabs.',
        },
      },
    },
  },
  activeTabId: {
    type: 'enum',
    values: ['string', 'null'],
    description:
      'ID of the currently active tab. Omit to auto-detect from the current route. Set to null for no active tab.',
  },
  breadcrumbs: {
    type: 'complex',
    deprecated: true,
    description: 'Breadcrumb trail displayed above the title.',
    complexType: {
      name: 'HeaderBreadcrumb[]',
      properties: {
        label: {
          type: 'string',
          required: true,
          description: 'Display text for the breadcrumb. Truncated at 240px.',
        },
        href: {
          type: 'string',
          required: true,
          description: 'URL for the breadcrumb link.',
        },
      },
    },
  },
  ...classNamePropDefs,
};
