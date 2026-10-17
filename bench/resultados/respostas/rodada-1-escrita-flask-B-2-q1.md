# flask B rep 2 pergunta 1

> Como o Flask torna o objeto global 'request' disponível durante uma requisição e o que acontece no fim dela? Cite arquivos e funções principais. Responda em até 10 linhas.

Registrado: 4 fatos sobre a unificação de `app_ctx`/`request_ctx`, o `LocalProxy` de `request`, o ciclo push/pop em `wsgi_app`, e a armadilha do `_push_count` em pushes múltiplos.
