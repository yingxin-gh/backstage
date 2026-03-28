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

import { useApi, useRouteRef } from '@backstage/core-plugin-api';
import {
  Content,
  EmptyState,
  ErrorPanel,
  Header,
  Page,
} from '@backstage/core-components';
import {
  Accordion,
  AccordionGroup,
  AccordionPanel,
  AccordionTrigger,
  Flex,
  List,
  ListRow,
  SearchField,
  Text,
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

function ActionDetail({ action }: { action: Action }) {
  const { t } = useTranslationRef(scaffolderTranslationRef);
  const expanded = useState<Expanded>({});

  const partialSchemaRenderContext: Omit<SchemaRenderContext, 'parentId'> = {
    expanded,
  };

  const hasInput = !!action.schema?.input;
  const hasOutput = !!action.schema?.output;
  const hasExamples = !!action.examples;

  if (!hasInput && !hasOutput && !hasExamples) {
    return null;
  }

  return (
    <AccordionGroup allowsMultiple defaultExpandedKeys={['input']}>
      {hasInput && (
        <Accordion id="input">
          <AccordionTrigger title={t('actionsPage.action.input')} />
          <AccordionPanel>
            <RenderSchema
              strategy="properties"
              context={{
                parentId: `${action.id}.input`,
                ...partialSchemaRenderContext,
              }}
              schema={action?.schema?.input}
            />
          </AccordionPanel>
        </Accordion>
      )}
      {hasOutput && (
        <Accordion id="output">
          <AccordionTrigger title={t('actionsPage.action.output')} />
          <AccordionPanel>
            <RenderSchema
              strategy="properties"
              context={{
                parentId: `${action.id}.output`,
                ...partialSchemaRenderContext,
              }}
              schema={action?.schema?.output}
            />
          </AccordionPanel>
        </Accordion>
      )}
      {hasExamples && (
        <Accordion id="examples">
          <AccordionTrigger title={t('actionsPage.action.examples')} />
          <AccordionPanel>
            <ScaffolderUsageExamplesTable examples={action.examples!} />
          </AccordionPanel>
        </Accordion>
      )}
    </AccordionGroup>
  );
}

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

  const [selectedActionId, setSelectedActionId] = useState<
    string | undefined
  >();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredActions = useMemo(() => {
    const nonLegacy =
      actions?.filter(action => !action.id.startsWith('legacy:')) ?? [];
    if (!searchQuery) {
      return nonLegacy;
    }
    const lowerQuery = searchQuery.toLowerCase();
    return nonLegacy.filter(
      action =>
        action.id.toLowerCase().includes(lowerQuery) ||
        action.description?.toLowerCase().includes(lowerQuery),
    );
  }, [actions, searchQuery]);

  const selectedAction = useMemo(
    () => filteredActions.find(a => a.id === selectedActionId),
    [filteredActions, selectedActionId],
  );

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

  if (!loading && !filteredActions.length) {
    return (
      <Flex direction="column" gap="4">
        <SearchField
          aria-label={t('actionsPage.content.searchFieldPlaceholder')}
          placeholder={t('actionsPage.content.searchFieldPlaceholder')}
          value={searchQuery}
          onChange={setSearchQuery}
        />
        <EmptyState
          missing="info"
          title={t('actionsPage.content.emptyState.title')}
          description={t('actionsPage.content.emptyState.description')}
        />
      </Flex>
    );
  }

  return (
    <Flex direction="column" gap="4">
      <SearchField
        aria-label={t('actionsPage.content.searchFieldPlaceholder')}
        placeholder={t('actionsPage.content.searchFieldPlaceholder')}
        value={searchQuery}
        onChange={setSearchQuery}
      />
      <List
        aria-label={t('actionsPage.title')}
        selectionMode="single"
        selectionBehavior="toggle"
        selectedKeys={selectedActionId ? [selectedActionId] : []}
        onSelectionChange={selection => {
          if (selection === 'all') {
            return;
          }
          const selected = [...selection][0] as string | undefined;
          setSelectedActionId(prev =>
            prev === selected ? undefined : selected,
          );
        }}
      >
        {filteredActions.map(action => (
          <ListRow
            key={action.id}
            id={action.id}
            textValue={action.id}
            description={
              selectedAction ? undefined : action.description ?? undefined
            }
          >
            {action.id}
          </ListRow>
        ))}
      </List>
      {selectedAction && (
        <Flex direction="column" gap="3">
          <Flex direction="column" gap="1">
            <Text as="h2" variant="title-medium" weight="bold">
              {selectedAction.id}
            </Text>
            {selectedAction.description && (
              <Text as="p" variant="body-medium" color="secondary">
                {selectedAction.description}
              </Text>
            )}
          </Flex>
          <ActionDetail action={selectedAction} />
        </Flex>
      )}
    </Flex>
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
