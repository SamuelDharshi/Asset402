//! CLI tool for the `CarbonCredit` smart contract.

use carbon_credits::CarbonCreditHostRef;
use odra::host::{HostEnv, NoArgs};
use odra::schema::casper_contract_schema::NamedCLType;
use odra_cli::{
    deploy::DeployScript,
    scenario::{Args, Error, Scenario, ScenarioMetadata},
    CommandArg, ContractProvider, DeployedContractsContainer, DeployerExt,
    OdraCli,
};

/// Deploys the `CarbonCredit` contract and registers it in the container.
pub struct CarbonCreditDeployScript;

impl DeployScript for CarbonCreditDeployScript {
    fn deploy(
        &self,
        env: &HostEnv,
        container: &mut DeployedContractsContainer,
    ) -> Result<(), odra_cli::deploy::Error> {
        let _contract = CarbonCreditHostRef::load_or_deploy(
            env,
            NoArgs,
            container,
            350_000_000_000, // gas limit — adjust as needed
        )?;

        Ok(())
    }
}

/// Scenario: query the milliCUC balance of a given address.
pub struct BalanceOfScenario;

impl Scenario for BalanceOfScenario {
    fn args(&self) -> Vec<CommandArg> {
        vec![CommandArg::new(
            "account",
            "The Casper account hash to query",
            NamedCLType::Key,
        )]
    }

    fn run(
        &self,
        env: &HostEnv,
        container: &DeployedContractsContainer,
        args: Args,
    ) -> Result<(), Error> {
        use odra::Address;
        let mut contract = container.contract_ref::<CarbonCreditHostRef>(env)?;
        let account = args.get_single::<Address>("account")?;

        env.set_gas(50_000_000);
        let balance = contract.balance_of(account);
        println!(
            "CUC balance of {:?}: {} milliCUC ({:.3} CUC)",
            account,
            balance,
            balance as f64 / 1000.0
        );

        Ok(())
    }
}

impl ScenarioMetadata for BalanceOfScenario {
    const NAME: &'static str = "balance_of";
    const DESCRIPTION: &'static str =
        "Queries the milliCUC balance of a given Casper account address";
}

/// Main entry point for the CLI tool.
pub fn main() {
    OdraCli::new()
        .about("CLI tool for the CarbonCredit smart contract")
        .deploy(CarbonCreditDeployScript)
        .contract::<CarbonCreditHostRef>()
        .scenario(BalanceOfScenario)
        .build()
        .run();
}
