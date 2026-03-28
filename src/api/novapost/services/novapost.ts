const NOVA_POST_API_URL = 'https://api.novaposhta.ua/v2.0/json/';

type TNovaPostRequest = {
  modelName: string;
  calledMethod: string;
  methodProperties: Record<string, unknown>;
};

// inputs {modelName, calledMethod, methodProperties}, does POST to Nova Post API with API key, returns parsed JSON response
async function callNovaPostApi({ modelName, calledMethod, methodProperties }: TNovaPostRequest) {
  const apiKey = process.env.NOVA_POST_API_KEY;

  const response = await fetch(NOVA_POST_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apiKey,
      modelName,
      calledMethod,
      methodProperties,
    }),
  });

  return response.json();
}

export default {
  callNovaPostApi,
};
