/*
 * Copyright 2026 The Backstage Authors
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
import { GithubConnectionType } from './github';
import { GitlabConnectionType } from './gitlab';
import { getConnectionType, isConnectionTypeKey } from './lookup';

describe('definitions/lookup', () => {
  it('looks up known connection types and recognises their keys', () => {
    expect(getConnectionType('github')).toBe(GithubConnectionType);
    expect(getConnectionType('gitlab')).toBe(GitlabConnectionType);

    expect(isConnectionTypeKey('github')).toBe(true);
    expect(isConnectionTypeKey('gitlab')).toBe(true);

    expect(isConnectionTypeKey('bitbucket')).toBe(false);
    expect(isConnectionTypeKey('')).toBe(false);
    expect(isConnectionTypeKey(undefined)).toBe(false);
  });
});
