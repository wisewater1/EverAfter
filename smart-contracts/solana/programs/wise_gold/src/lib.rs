use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

// This is a placeholder ID for local development
declare_id!("WGold11111111111111111111111111111111111111");

#[program]
pub mod wise_gold_spoke {
    use super::*;

    /// Initializes a new Sovereign Covenant (Multi-sig Vault) on Solana.
    pub fn initialize_covenant(
        ctx: Context<InitializeCovenant>,
        required_quorum: u8,
        guardians: Vec<Pubkey>,
    ) -> Result<()> {
        let covenant = &mut ctx.accounts.covenant;
        require!(guardians.len() > 0, ErrorCode::InvalidGuardians);
        require!(
            required_quorum > 0 && required_quorum as usize <= guardians.len(),
            ErrorCode::InvalidQuorum
        );

        covenant.guardians = guardians;
        covenant.required_quorum = required_quorum;
        covenant.request_count = 0;
        covenant.bump = ctx.bumps.covenant;
        
        // Emitting an event ensures the EverAfter Python backend can track covenants formed
        emit!(CovenantFormed {
            covenant_pubkey: covenant.key(),
            required_quorum,
        });

        Ok(())
    }

    /// Propose a withdrawal from the vault.
    pub fn request_withdrawal(
        ctx: Context<RequestWithdrawal>,
        amount: u64,
        to: Pubkey,
        justification_cid: String,
    ) -> Result<()> {
        let covenant = &mut ctx.accounts.covenant;
        let request = &mut ctx.accounts.withdrawal_request;

        // Ensure the signer is actually a guardian of this covenant
        require!(
            covenant.guardians.contains(&ctx.accounts.guardian.key()),
            ErrorCode::Unauthorized
        );

        request.covenant = covenant.key();
        request.id = covenant.request_count;
        request.amount = amount;
        request.to = to;
        request.justification_cid = justification_cid;
        request.approvals = 1; // Auto-approve by creator
        request.executed = false;
        
        // Push the creator's pubkey into the approvals list
        request.approved_by.push(ctx.accounts.guardian.key());

        covenant.request_count = covenant.request_count.checked_add(1).unwrap();

        emit!(WithdrawalRequested {
            covenant_pubkey: covenant.key(),
            request_id: request.id,
            amount,
            to,
        });

        Ok(())
    }

    /// Note: Token-2022 logic for the Velocity Tax is implemented natively at the Mint extension level,
    /// rather than via Anchor program functions, ensuring *every* transfer across all Solana DEXs 
    /// enforces the Manna Pool tax automatically without custom instruction calls.
}

#[derive(Accounts)]
pub struct InitializeCovenant<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + 1 + 8 + 1 + (4 + 32 * 10) + 1, // Space for up to 10 guardians
        seeds = [b"covenant", payer.key().as_ref()],
        bump
    )]
    pub covenant: Account<'info, CovenantState>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RequestWithdrawal<'info> {
    #[account(mut)]
    pub covenant: Account<'info, CovenantState>,
    #[account(
        init,
        payer = guardian,
        space = 8 + 32 + 8 + 8 + 32 + (4 + 64) + 1 + 1 + (4 + 32 * 10), // Generous space for dynamic strings and vec
        seeds = [b"request", covenant.key().as_ref(), covenant.request_count.to_le_bytes().as_ref()],
        bump
    )]
    pub withdrawal_request: Account<'info, WithdrawalRequest>,
    #[account(mut)]
    pub guardian: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct CovenantState {
    pub required_quorum: u8,
    pub request_count: u64,
    pub guardians: Vec<Pubkey>,
    pub bump: u8,
}

#[account]
pub struct WithdrawalRequest {
    pub covenant: Pubkey,
    pub id: u64,
    pub amount: u64,
    pub to: Pubkey,
    pub justification_cid: String,
    pub approvals: u8,
    pub executed: bool,
    pub approved_by: Vec<Pubkey>,
}

#[event]
pub struct CovenantFormed {
    pub covenant_pubkey: Pubkey,
    pub required_quorum: u8,
}

#[event]
pub struct WithdrawalRequested {
    pub covenant_pubkey: Pubkey,
    pub request_id: u64,
    pub amount: u64,
    pub to: Pubkey,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Covenant requires at least 1 guardian.")]
    InvalidGuardians,
    #[msg("Quorum must be greater than 0 and less than or equal to guardian count.")]
    InvalidQuorum,
    #[msg("Signer is not an authorized guardian of this covenant.")]
    Unauthorized,
}
