# Закреплённая схема gateway

`schema.graphqls` и `manifest.json` — копия проверенного GitHub Actions artifact;
`pin.json` — ожидаемый commit, изменяемый отдельным решением при обновлении контракта.
`npm run schema:check` проверяет repository, SHA, checksum и валидность SDL.
Codegen читает локальную копию; соседний checkout gateway не нужен.

Обновление: скачать `graphql-schema-<SHA>` из зелёного gateway workflow по run ID,
заменить SDL/manifest, установить согласованный SHA в pin.json, выполнить schema:check
и codegen. Все три файла коммитятся вместе. Доступ приватного artifact требует token
с Actions read только при обновлении; CI проверяет сохранённую копию без этого token.
Подробности: gateway `api/graphql/ARTIFACT.md`. Активация рукописных типов C6 отдельно.
