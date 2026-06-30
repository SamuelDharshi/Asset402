//! CLI tool for the `FractionalRegistry` smart contract.

use fractional_registry::FractionalRegistryHostRef;
use odra::host::{HostEnv, NoArgs};
use odra::schema::casper_contract_schema::NamedCLType;
use odra_cli::{
    deploy::DeployScript,
    scenario::{Args, Error, Scenario, ScenarioMetadata},
    CommandArg, ContractProvider, DeployedContractsContainer, DeployerExt,
    OdraCli,
};

/// Deploys the `FractionalRegistry` contract and registers it in the container.
pub struct FractionalRegistryDeployScript;

impl DeployScript for FractionalRegistryDeployScript {
    fn deploy(
        &self,
        env: &HostEnv,
        container: &mut DeployedContractsContainer,
    ) -> Result<(), odra_cli::deploy::Error> {
        let _registry = FractionalRegistryHostRef::load_or_deploy(
            env,
            NoArgs,
            container,
            400_000_000_000, // gas limit — adjust as needed
        )?;

        Ok(())
    }
}

/// Scenario: fetch an offering by ID.
pub struct GetOfferingScenario;

impl Scenario for GetOfferingScenario {
    fn args(&self) -> Vec<CommandArg> {
        vec![CommandArg::new(
            "offering_id",
            "The numeric ID of the offering to query",
            NamedCLType::U64,
        )]
    }

    fn run(
        &self,
        env: &HostEnv,
        container: &DeployedContractsContainer,
        args: Args,
    ) -> Result<(), Error> {
        let mut contract = container.contract_ref::<FractionalRegistryHostRef>(env)?;
        let offering_id = args.get_single::<u64>("offering_id")?;

        env.set_gas(50_000_000);
        let offering = contract.get_offering(offering_id);
        println!(
            "Offering #{}: asset_id={}, total_shares={}, shares_sold={}, price_per_share={}, active={}",
            offering_id,
            offering.asset_id,
            offering.total_shares,
            offering.shares_sold,
            offering.price_per_share_motes,
            offering.active,
        );

        Ok(())
    }
}

impl ScenarioMetadata for GetOfferingScenario {
    const NAME: &'static str = "get_offering";
    const DESCRIPTION: &'static str =
        "Fetches and prints the details of a fractional offering by ID";
}

/// Main entry point for the CLI tool.
pub fn main() {
    OdraCli::new()
        .about("CLI tool for the FractionalRegistry smart contract")
        .deploy(FractionalRegistryDeployScript)
        .contract::<FractionalRegistryHostRef>()
        .scenario(GetOfferingScenario)
        .build()
        .run();
}
