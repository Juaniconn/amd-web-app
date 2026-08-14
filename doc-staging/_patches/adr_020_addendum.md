## Impacto

- El maestro de clientes queda persistido en PostgreSQL y es dependencia de Fase 3.
- Dirección puede consultar la cartera; Ventas puede operarla; el resto de roles no ve el módulo.
- El listado no introduce TanStack Table; un cambio futuro de librería de tablas no rompe el esquema.
- `activity_logs` queda listo para reutilizarse en cotizaciones y pedidos (ADR-010).

## Consecuencias futuras

- Toda cotización deberá referenciar `customers.id` (y preferentemente `contacts.id`).
- El siguiente `drizzle-kit generate` debe contar con snapshot 0001; si no, puede reemitir el CRM.
- Re-seed de demo hace DELETE físico de contactos DEMO: no usar seed contra datos reales de esos códigos.
- Restaurar un cliente archivado no está implementado; hay que diseñarlo antes de usarlo en operación diaria.
