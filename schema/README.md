# Закреплённая схема gateway

`schema.graphqls` и `manifest.json` — копия проверенного GitHub Actions artifact;
`pin.json` — ожидаемый commit, изменяемый отдельным решением при обновлении контракта.
`npm run schema:check` проверяет repository, SHA, checksum и валидность SDL.
Codegen читает локальную копию; соседний checkout gateway не нужен.
После изменения запроса или фрагмента запустите `npm run codegen` и
добавьте `src/api/generated.ts` в тот же коммит. `npm run codegen:check`
проверяет совпадение сгенерированных типов без записи файлов.

Для `graphql-config@6.0.0` закреплен `minimatch@11.0.9` из-за
[GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249).
Override можно убрать, когда `graphql-config` сам перейдет на исправленную версию.

Обновление: скачать `graphql-schema-<SHA>` из зеленого прогона Gateway на
`main` по run ID, где SHA коммита совпадает с SHA в имени artifact.
Заменить SDL/manifest, установить согласованный SHA и run ID в `pin.json`,
выполнить `npm run codegen` и `npm run typecheck`. Файлы схемы и обновленные
типы коммитятся вместе. Доступ к приватному artifact нужен только при
обновлении; CI проверяет сохраненную копию без токена.
Подробности: gateway `api/graphql/ARTIFACT.md`.
