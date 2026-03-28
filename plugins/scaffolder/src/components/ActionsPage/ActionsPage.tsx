/*
 * Copyright 2021 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { useMemo, useState } from 'react';
import useAsync from 'react-use/esm/useAsync';
import { Action, scaffolderApiRef } from '@backstage/plugin-scaffolder-react';
import Box from '@material-ui/core/Box';
import Typography from '@material-ui/core/Typography';
import { makeStyles } from '@material-ui/core/styles';
import LinkIcon from '@material-ui/icons/Link';

import { useApi, useRouteRef } from '@backstage/core-plugin-api';
import {
  Content,
  EmptyState,
  ErrorPanel,
  Header,
  Link,
  MarkdownContent,
  Page,
} from '@backstage/core-components';
import {
  CellText,
  SearchField,
  Table,
  useTable,
  type ColumnConfig,
  type TableItem,
} from '@backstage/ui';
import { ScaffolderPageContextMenu } from '@backstage/plugin-scaffolder-react/alpha';
import { useNavigate } from 'react-router-dom';
import {
  editRouteRef,
  rootRouteRef,
  scaffolderListTaskRouteRef,
  templatingExtensionsRouteRef,
} from '../../routes';
import { useTranslationRef } from '@backstage/core-plugin-api/alpha';
import { scaffolderTranslationRef } from '../../translation';
import { Expanded, RenderSchema, SchemaRenderContext } from '../RenderSchema';
import { ScaffolderUsageExamplesTable } from '../ScaffolderUsageExamplesTable';

const useStyles = makeStyles(theme => ({
  code: {
    fontFamily: 'Menlo, monospace',
    padding: theme.spacing(1),
    backgroundColor:
      theme.palette.type === 'dark'
        ? theme.palette.grey[700]
        : theme.palette.grey[300],
    display: 'inline-block',
    borderRadius: 5,
    border: `1px solid ${theme.palette.grey[500]}`,
    position: 'relative',
  },

  codeRequired: {
    '&::after': {
      position: 'absolute',
      content: '"*"',
      top: 0,
      right: theme.spacing(0.5),
      fontWeight: 'bolder',
      color: theme.palette.error.light,
    },
  },
  link: {
    paddingLeft: theme.spacing(1),
  },
}));

interface ActionTableItem extends TableItem {
  action: Action;
}

function ActionDetail({ action }: { action: Action }) {
  const classes = useStyles();
  const { t } = useTranslationRef(scaffolderTranslationRef);
  const expanded = useState<Expanded>({});

  const partialSchemaRenderContext: Omit<SchemaRenderContext, 'parentId'> = {
    classes,
    expanded,
    headings: [<Typography variant="h6" component="h4" />],
  };

  return (
    <Box pb={1}>
      <Box display="flex" alignItems="center" pb={1}>
        <Typography
          id={action.id.replaceAll(':', '-')}
          variant="h5"
          component="h2"
          className={classes.code}
        >
          {action.id}
        </Typography>
        <Link
          className={classes.link}
          to={`#${action.id.replaceAll(':', '-')}`}
        >
          <LinkIcon />
        </Link>
      </Box>
      {action.description && <MarkdownContent content={action.description} />}
      {action.schema?.input && (
        <Box pb={2}>
          <Typography variant="h6" component="h3">
            {t('actionsPage.action.input')}
          </Typography>
          <RenderSchema
            strategy="properties"
            context={{
              parentId: `${action.id}.input`,
              ...partialSchemaRenderContext,
            }}
            schema={action?.schema?.input}
          />
        </Box>
      )}
      {action.schema?.output && (
        <Box pb={2}>
          <Typography variant="h5" component="h3">
            {t('actionsPage.action.output')}
          </Typography>
          <RenderSchema
            strategy="properties"
            context={{
              parentId: `${action.id}.output`,
              ...partialSchemaRenderContext,
            }}
            schema={action?.schema?.output}
          />
        </Box>
      )}
      {action.examples && (
        <Box pb={2}>
          <Typography variant="h6" component="h3">
            {t('actionsPage.action.examples')}
          </Typography>
          <ScaffolderUsageExamplesTable examples={action.examples} />
        </Box>
      )}
    </Box>
  );
}

const columnConfig: ColumnConfig<ActionTableItem>[] = [
  {
    id: 'name',
    label: 'Name',
    isRowHeader: true,
    defaultWidth: '1fr',
    cell: item => <CellText title={item.action.id} />,
  },
  {
    id: 'description',
    label: 'Description',
    defaultWidth: '2fr',
    cell: item => <CellText title={item.action.description ?? ''} />,
  },
];

export const ActionPageContent = () => {
  const api = useApi(scaffolderApiRef);
  const { t } = useTranslationRef(scaffolderTranslationRef);

  const {
    loading,
    value: actions,
    error,
  } = useAsync(async () => {
    return api.listActions();
  }, [api]);

  const [selectedAction, setSelectedAction] = useState<Action | undefined>();

  const tableData = useMemo(
    () =>
      actions
        ?.filter(action => !action.id.startsWith('legacy:'))
        .map(
          (action): ActionTableItem => ({
            id: action.id,
            action,
          }),
        ),
    [actions],
  );

  const { tableProps, search } = useTable({
    mode: 'complete',
    data: tableData,
    paginationOptions: { type: 'none' },
    searchFn: (items, query) => {
      const lowerQuery = query.toLowerCase();
      return items.filter(
        item =>
          item.action.id.toLowerCase().includes(lowerQuery) ||
          item.action.description?.toLowerCase().includes(lowerQuery),
      );
    },
  });

  if (error) {
    return (
      <>
        <ErrorPanel error={error} />
        <EmptyState
          missing="info"
          title={t('actionsPage.content.emptyState.title')}
          description={t('actionsPage.content.emptyState.description')}
        />
      </>
    );
  }

  return (
    <>
      <SearchField
        aria-label={t('actionsPage.content.searchFieldPlaceholder')}
        placeholder={t('actionsPage.content.searchFieldPlaceholder')}
        style={{ marginBottom: 24 }}
        {...search}
      />
      <Table
        columnConfig={columnConfig}
        {...tableProps}
        loading={loading}
        emptyState={
          <EmptyState
            missing="info"
            title={t('actionsPage.content.emptyState.title')}
            description={t('actionsPage.content.emptyState.description')}
          />
        }
        rowConfig={{
          onClick: item => {
            setSelectedAction(prev =>
              prev?.id === item.action.id ? undefined : item.action,
            );
          },
        }}
      />
      {selectedAction && (
        <Box mt={2}>
          <ActionDetail action={selectedAction} />
        </Box>
      )}
    </>
  );
};

export type ActionsPageProps = {
  contextMenu?: {
    editor?: boolean;
    tasks?: boolean;
    create?: boolean;
    templatingExtensions?: boolean;
  };
};

export const ActionsPage = (props: ActionsPageProps) => {
  const navigate = useNavigate();
  const editorLink = useRouteRef(editRouteRef);
  const tasksLink = useRouteRef(scaffolderListTaskRouteRef);
  const createLink = useRouteRef(rootRouteRef);
  const templatingExtensionsLink = useRouteRef(templatingExtensionsRouteRef);
  const { t } = useTranslationRef(scaffolderTranslationRef);

  const scaffolderPageContextMenuProps = {
    onEditorClicked:
      props?.contextMenu?.editor !== false
        ? () => navigate(editorLink())
        : undefined,
    onActionsClicked: undefined,
    onTasksClicked:
      props?.contextMenu?.tasks !== false
        ? () => navigate(tasksLink())
        : undefined,
    onCreateClicked:
      props?.contextMenu?.create !== false
        ? () => navigate(createLink())
        : undefined,
    onTemplatingExtensionsClicked:
      props?.contextMenu?.templatingExtensions !== false
        ? () => navigate(templatingExtensionsLink())
        : undefined,
  };

  return (
    <Page themeId="home">
      <Header
        pageTitleOverride={t('actionsPage.pageTitle')}
        title={t('actionsPage.title')}
        subtitle={t('actionsPage.subtitle')}
      >
        <ScaffolderPageContextMenu {...scaffolderPageContextMenuProps} />
      </Header>
      <Content>
        <ActionPageContent />
      </Content>
    </Page>
  );
};
