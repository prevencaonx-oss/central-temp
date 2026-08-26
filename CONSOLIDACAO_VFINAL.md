# Controle de Temperatura Nilo — Consolidação VFinal

## Objetivo
Construir uma versão única, estável e testável do sistema, sem carregadores compactados, hotfixes de modal, patches de login ou camadas antigas sobrepostas.

## Regra de publicação
A branch `main` não será alterada durante a consolidação. A publicação final só ocorre após validação do fluxo: Login -> escolha Rede/Loja -> Dashboard -> Coleta -> Histórico/Relatórios -> Administração.

## Base funcional escolhida
A base de consolidação parte da V24 Segurança Reforçada, que já reúne as funções de setores, recorrência, incidentes/equipamento com defeito, coleta 1x/3x, controles de Admin, troca de senha e segurança.

## Backend confirmado
O Supabase atual já possui suporte para:
- lojas (`stores`)
- perfis e permissões (`profiles`)
- setores (`sectors`)
- equipamentos com setor, status operacional e 1x/3x (`equipment`)
- coletas com 1 ou 3 temperaturas, média, mínima e máxima (`readings`)
- condição/defeito do equipamento na coleta (`readings.equipment_condition` e `equipment_issue_note`)
- incidentes de equipamento (`equipment_incidents`)
- alertas (`temperature_alerts`)
- auditoria (`audit_logs`)

## Funcional obrigatório
- Dashboard Geral da rede
- Dashboard por Loja
- Coletas
- Alertas
- Equipamentos
- Lojas
- Setores
- Relatórios
- Usuários
- Auditoria
- Minha Conta
- Perfis Admin, Líder, Agente de Prevenção e Personalizado
- Admin Principal protegido por ID interno
- Admin Principal pode alterar o próprio nome de usuário e senha
- Senha forte e confirmação da senha atual
- Permissões por função e por loja
- Coleta 1x ou 3x por equipamento
- Em coleta 3x: média, mínima e máxima
- Qualquer amostra fora da faixa torna a coleta fora do padrão
- Ação corretiva obrigatória para desvio
- No mínimo 3 coletas por equipamento por dia, sem horário fixo
- Indicador 0/3, 1/3, 2/3, 3/3, permitindo mais de 3
- Equipamento estragado/com defeito/em manutenção/indisponível
- Histórico de incidentes
- Recorrência por equipamento, setor, loja e período
- Filtros por data/período, loja, setor e equipamento
- Relatórios por loja e rede
- Exclusões apenas para quem tiver autorização
- Sincronização Supabase entre dispositivos

## Visual obrigatório
- Identidade NILO Supermercado
- Nome: CONTROLE DE TEMPERATURA
- Logo oficial Nilo
- Mascote Nilo
- Slogan exibido apenas uma vez: "NO QUIETO NO QUIETO O NILO VENDE MAIS BARATO"
- Bloco institucional de Prevenção de Perdas no espaço que antes repetia o slogan
- Sidebar azul-escuro no desktop
- Amarelo como destaque
- Dashboard no padrão visual aprovado
- Login centralizado e profissional
- Mobile realmente responsivo

## Arquitetura nova
A nova versão será organizada em arquivos simples e legíveis:
- `index.html`
- `assets/app.js`
- `assets/base.css`
- `assets/nilo.css`
- `assets/nilo-logo.png`
- `assets/nilo-mascote.png`

Não usar na versão final:
- Base64/gzip no carregamento da aplicação
- `atob()` para reconstruir o app
- `document.write()` para montar versões antigas
- hotfixes V13/V29
- substituição de `showModal()` em tempo de execução
- patches externos para recriar o login

## Estado inicial da auditoria
O repositório principal contém várias gerações simultâneas (V11, V15, V17, V24, V25, V27, V30-V34 e hotfixes). Essa sobreposição é a principal causa de regressões observadas no login e nos modais.
