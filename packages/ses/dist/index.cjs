"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  mockSES: () => mockSES,
  sendEmail: () => sendEmail,
  sesClient: () => sesClient
});
module.exports = __toCommonJS(src_exports);

// src/mock.ts
var import_client_sesv2 = require("@aws-sdk/client-sesv2");
var import_aws_sdk_client_mock = require("aws-sdk-client-mock");
var mockSES = () => {
  const fn = vi.fn();
  (0, import_aws_sdk_client_mock.mockClient)(import_client_sesv2.SESv2Client).on(import_client_sesv2.SendEmailCommand).callsFake(() => {
    fn();
  });
  beforeEach(() => {
    fn.mockClear();
  });
  return fn;
};

// src/client.ts
var import_client_sesv22 = require("@aws-sdk/client-sesv2");
var import_utils = require("@awsless/utils");
var sesClient = (0, import_utils.globalClient)(() => {
  return new import_client_sesv22.SESv2Client({});
});

// src/commands.ts
var import_client_sesv23 = require("@aws-sdk/client-sesv2");
var sendEmail = async ({ client = sesClient(), subject, from, to, html }) => {
  const command = new import_client_sesv23.SendEmailCommand({
    FromEmailAddress: from,
    Destination: {
      ToAddresses: to
    },
    Content: {
      Simple: {
        Subject: {
          Data: subject,
          Charset: "UTF-8"
        },
        Body: {
          Html: {
            Data: html,
            Charset: "UTF-8"
          }
        }
      }
    }
  });
  return client.send(command);
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  mockSES,
  sendEmail,
  sesClient
});
