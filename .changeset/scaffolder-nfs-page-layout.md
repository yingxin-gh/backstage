---
'@backstage/plugin-scaffolder': patch
---

Fixed the layout of the scaffolder plugin in the new frontend system to use the new page layout. Direct `FormFieldBlueprint` attachments to the scaffolder page are no longer consumed, custom form fields should instead be provided through the form fields API.
