<?php

namespace BookStack\Access\Controllers;

use BookStack\App\Providers\VatgerConnectProvider;
use BookStack\App\Providers\VatsimConnectProvider;
use BookStack\Http\Controller;
use BookStack\Users\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use League\OAuth2\Client\Provider\Exception\IdentityProviderException;
use UnexpectedValueException;

class ConnectController extends Controller
{
    /**
     * The Authentication Provider Instance
     */
    protected VatsimConnectProvider|VatgerConnectProvider $provider;

    /**
     * Initialize the Controller with a new ConnectProvider instance
     */
    public function __construct()
    {
        if (config('connect.use_vatger')) {
            $this->provider = new VatgerConnectProvider();
        } else {
            $this->provider = new VatsimConnectProvider();
        }
    }

    /**
     * Authentication entrypoint
     * This function will handle the state and request of an authentication attempt
     */
    public function login(Request $request)
    {
        // Initiation state is without 'code' and 'state'
        if (!$request->has('code') || !$request->has('state')) {
            try {
                $authenticationUrl = $this->provider->getAuthorizationUrl();
                $request->session()->put('authentication.connect.state', $this->provider->getState());
                return redirect()->away($authenticationUrl);
            } catch (\Illuminate\Http\Client\ConnectionException $ce) {
                // Send the user to the service unavailable page
                return redirect('/')->withErrors('Connect error');
            }
        } elseif ($request->input('state') !== session()->pull('authentication.connect.state')) {
            // Within this state there is no state. The only option here is to start again.
            $request->session()->invalidate(); // Invalidate and regenerate the session
            return redirect()->route('authentication.connect.login');
        } else {
            return $this->verifyLogin($request);
        }
    }

    /**
     * Check that all required data is received from the VATSIM Connect authentication system
     */
    protected function verifyLogin(Request $request)
    {
        try {
            $accessToken = $this->provider->getAccessToken('authorization_code', [
                'code' => $request->input('code')
            ]);
        } catch (UnexpectedValueException $e) {
            Log::error("[ConnectController]::_verifyLogin::AccessToken::" . $e->getMessage());
            return redirect('/')->withErrors('Connect error'); // Wrong format received from the Connect service
        } catch (IdentityProviderException $e) {
            Log::error("[ConnectController]::_verifyLogin::AccessToken::" . $e->getMessage());
            return redirect('/')->withErrors('Connect error');
        }

        try {
            $resourceOwner = json_decode(json_encode($this->provider->getResourceOwner($accessToken)->toArray()));
            // $resourceOwner = $this->_provider->getResourceOwner($accessToken);
        } catch (UnexpectedValueException $e) {
            Log::error("[ConnectController]::_verifyLogin::ResourceOwner::" . $e->getMessage());
            return redirect('/')->withErrors('Connect error');
        }

        $data = $this->provider->getMappedData($accessToken);

        if (!isset($data['id']) || !isset($data['firstname']) || !isset($data['lastname']) || !isset($data['email']) || !isset($data['access_token'])) {
            return redirect('/')->withErrors('Connect error');
        }
        // All checks completed. Let's finally sign in the user
        $user = $this->completeLogin($data);

        Auth::login($user, true);
        if ($request->has('email')) {
            session()->flashInput([
                'email' => $user->email,
            ]);
        }

        return redirect()->intended('/');
    }

    /**
     * Complete the authentication process.
     *
     * @param array $data
     * @return User
     */
    protected function completeLogin(array $data): User
    {
        $user = User::query()->find($data['id']);

        if (!$user) {
            // Create random user slug
            $value = $data['id'];
            $slug = Str::slug($value, "-");

            // We need to create a new user here
            $user = User::query()->create([
                'id' => $data['id'],
                'name' => $data['id'],
                'fullname' => $data['firstname'] . ' ' . $data['lastname'],
                'email' =>  $data['email'],
                'slug' => $slug
            ]);

            // Add role to new user (default role = viewer)
            DB::table('role_user')->insert([
                'user_id' => $user->id,
                'role_id' => 3
            ]);

            // If the user has given us permanent access to the data
            if ($data['token_valid']) {
                $user->access_token = $data['access_token'];
                $user->refresh_token = $data['refresh_token'];
                $user->token_expires = $data['token_expires'];
            }
        } else {
            // We know the user exists, so we need to update their account data
            $user->update([
                'name' => $data['id'],
                'fullname' => $data['firstname'] . ' ' . $data['lastname'],
                'email' => $data['email'],
            ]);

            //$user->tokens()->delete();
        }
        //$user->createToken('api-token');

        return $user->fresh();
    }

    /**
     * Display a failed message and then return to the login
     *
     */
    public function failed(): RedirectResponse
    {
        return redirect('/')->with('error', 'Error logging in. Please try again.');
    }

    /**
     * End an authenticated session
     */
    public function logout(): RedirectResponse
    {
        Auth::logout();

        return redirect()->route('landing')->with('success', 'Logged out successfully.');
    }
}
