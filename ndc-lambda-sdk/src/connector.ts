import sdk from "@hasura/ndc-sdk-typescript";
import { JSONSchemaObject } from "@json-schema-tools/meta-schema";
import path from "node:path"
import { FunctionsSchema, getNdcSchema } from "./schema";
import { deriveSchema, printCompilerDiagnostics, printFunctionIssues } from "./inference";

export type RawConfiguration = {};
export type Configuration = {
  functionsSchema: FunctionsSchema
};

export type State = {
  functions: RuntimeFunctions
}

export type RuntimeFunctions = {
  [function_name: string]: Function
}

export const RAW_CONFIGURATION_SCHEMA: JSONSchemaObject = {
  description: 'NodeJS Functions SDK Connector Configuration',
  type: 'object',
  required: [],
  properties: {}
};

export type ConnectorOptions = {
  functions: string
}

export function createConnector(options: ConnectorOptions): sdk.Connector<RawConfiguration, Configuration, State> {
  const functionsFilePath = path.resolve(options.functions);

  const connector: sdk.Connector<RawConfiguration, Configuration, State> = {
    get_raw_configuration_schema: function (): JSONSchemaObject {
      return RAW_CONFIGURATION_SCHEMA;
    },

    make_empty_configuration: function (): RawConfiguration {
      return {};
    },

    update_configuration: async function (rawConfiguration: RawConfiguration): Promise<RawConfiguration> {
      return {};
    },

    validate_raw_configuration: async function (rawConfiguration: RawConfiguration): Promise<Configuration> {
      const schemaResults = deriveSchema(functionsFilePath);
      printCompilerDiagnostics(schemaResults.compilerDiagnostics);
      printFunctionIssues(schemaResults.functionIssues);
      return {
        functionsSchema: schemaResults.functionsSchema
      }
    },

    try_init_state: async function (configuration: Configuration, metrics: unknown): Promise<State> {
      if (Object.keys(configuration.functionsSchema.functions).length === 0) {
        // If there are no declared functions, don't bother trying to load the code.
        // There's very likely to be compiler errors during schema inference that will
        // block the load anyway, or the user hasn't written anything useful yet.
        return { functions: {} }
      }
      return { functions: require(functionsFilePath) }
    },

    get_capabilities: function (configuration: Configuration): sdk.CapabilitiesResponse {
      return {
        versions: "^0.1.0",
        capabilities: {
          query: {},
        }
      };
    },

    get_schema: async function (configuration: Configuration): Promise<sdk.SchemaResponse> {
      return getNdcSchema(configuration.functionsSchema);
    },

    query: function (configuration: Configuration, state: State, request: sdk.QueryRequest): Promise<sdk.QueryResponse> {
      throw new Error("Function not implemented.");
    },

    mutation: function (configuration: Configuration, state: State, request: sdk.MutationRequest): Promise<sdk.MutationResponse> {
      throw new Error("Function not implemented.");
    },

    explain: function (configuration: Configuration, state: State, request: sdk.QueryRequest): Promise<sdk.ExplainResponse> {
      throw new Error("Function not implemented.");
    },

    health_check: async function (configuration: Configuration, state: State): Promise<undefined> {
      return undefined;
    },

    fetch_metrics: async function (configuration: Configuration, state: State): Promise<undefined> {
      return undefined;
    },
  }

  return connector;
}
