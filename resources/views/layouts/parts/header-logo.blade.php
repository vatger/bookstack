@php
    $darkMode = boolval(setting()->getForCurrentUser('dark-mode-enabled'));
@endphp

<a href="{{ url('/') }}" data-shortcut="home_view" class="logo">
    @if($darkMode)
        <img class="logo-image" src="/kb-dark.png" alt="Logo">
    @else
        <img class="logo-image" src="/kb-light.png" alt="Logo">
    @endif

    @if (setting('app-name-header'))
        <span class="logo-text">{{ setting('app-name') }}</span>
    @endif
</a>