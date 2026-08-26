# Controle de Temperatura Nilo — Consolidação VFinal

## Objetivo
Construir uma versão única, estável e testável do sistema, sem carregadores compactados, hotfixes de modal, patches de login ou camadas antigas sobrepostas.

## Regra de publicação
A branch `main` não será alterada durante a consolidação. A publicação final só ocorre após validação do fluxo: Login -> escolha Rede/Loja -> Dashboard -> Coleta -> Histórico/Relatórios -> Administração.

## Base funcional escolhida
A base de consolidação parte da V24 Segurança Reforçada, que já reúne as funções de setores, recorrência, incidentes/equipamento com defeito, coleta 1x/3x, controles de Admin, troca de senha e segurança.

## Backend confirmado
O Supabase atual já possui suporte para lojas, perfis e permissões, setores, equipamentos com setor/status/1x-3x, coletas, condição do equipamento, incidentes, alertas e auditoria.

## Funcional obrigatório
Dashboard Geral e por Loja; Coletas; Alertas; Equipamentos; Lojas; Setores; Relatórios; Usuários; Auditoria; Minha Conta; perfis Admin/Líder/Agente/Personalizado; Admin Principal protegido; alteração segura de usuário/senha; coleta 1x/3x; qualquer amostra fora da faixa torna a coleta fora do padrão; ação corretiva obrigatória; mínimo 3 coletas/equipamento/dia sem horário fixo; equipamento estragado/manutenção/indisponível; recorrência; filtros; relatórios; exclusões por permissão; sincronização Supabase.

## Visual obrigatório
Identidade NILO Supermercado; nome CONTROLE DE TEMPERATURA; logo oficial; mascote; slogan apenas uma vez por tela; bloco institucional de Prevenção de Perdas; sidebar azul; amarelo de destaque; login profissional; mobile responsivo.

## Arquitetura nova
- `index.html`
- `assets/app-01.js` ... `assets/app-09.js`
- `assets/base-01.css` ... `assets/base-05.css`
- `assets/nilo.css`
- `assets/nilo-logo.webp`
- `assets/nilo-mascote.webp`

Não usar Base64/gzip para reconstruir o app, `atob()`, `document.write()` para montar versões antigas, hotfixes de modal ou patches externos de login.

## Auditoria técnica da consolidação
- 9 módulos JavaScript validados com `node --check`.
- `index.html` não referencia arquivos locais inexistentes.
- `atob()` removido da nova arquitetura.
- carregadores por partes antigas não são usados pelo novo `index.html`.
- frequência por horas removida da lógica nova; meta diária é 3 coletas por equipamento.
- `nilo.css`, logo e mascote integrados na branch consolidada.
- `base-05.css` corrigido após verificação de integridade.

## Próxima validação antes de publicar
Teste funcional do fluxo Login -> Rede/Loja -> Dashboard -> Coleta -> Alertas -> Relatórios -> Usuários/Minha Conta, seguido de validação responsiva desktop/mobile.
