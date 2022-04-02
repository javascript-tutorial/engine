module.exports = function(request) {
  if (!request || !request.method)
    return request;

  return {
    host:          request.host,
    protocol:      request.protocol,
    method:        request.method,
    url:           request.originalUrl,
    headers:       request.headers,
    body:          request.body,
    ip:            request.ip
  };
};
