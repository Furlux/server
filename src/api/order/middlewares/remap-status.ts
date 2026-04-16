// inputs ctx + next, does rename orderStatus↔status in request/response so frontend sees "status", returns void
const remapOrderStatus = async (ctx, next) => {
  // Incoming: rename status → orderStatus in request body
  if (ctx.request.body?.data?.status !== undefined) {
    ctx.request.body.data.orderStatus = ctx.request.body.data.status;
    delete ctx.request.body.data.status;
  }

  await next();

  // Outgoing: rename orderStatus → status in response
  if (!ctx.body?.data) return;

  const remap = (entry: Record<string, unknown>) => {
    if (entry && 'orderStatus' in entry) {
      entry.status = entry.orderStatus;
      delete entry.orderStatus;
    }
  };

  if (Array.isArray(ctx.body.data)) {
    ctx.body.data.forEach(remap);
  } else {
    remap(ctx.body.data);
  }
};

export default remapOrderStatus;
